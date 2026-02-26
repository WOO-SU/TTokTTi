import torch
import sys
import os
import time

from PIL import Image
from threading import Thread

# 设置模型加载相对路径
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', "..")))
from vl_open import Chat, dynamic_preprocess

from global_var import FIFOSafeCache

history_cache = FIFOSafeCache(capacity=1000)
first_chat_timestamp_cache = FIFOSafeCache(capacity=1000)

def init_model(sep_chat: False, stream: bool=False, device: str='cuda:0', language: str='eng', version: str='v1'):
    print(f'Initializing VLChat, sep_chat: {sep_chat}, stream: {stream}, device: {device}')
    with torch.device(device):
        chat = Chat(sep_chat=sep_chat, stream=stream, language=language, version=version)
        print('Initialization Finished')
        return chat

def add_history(question, history, sep_chat: bool=False, language: str='eng'):
    if not history:
        print('history not added because self.history is empty')
        return question
    if len(history) > 0:
        if language == 'kor':
            system = '당신은 AR 글래스의 지능형 비서이자 안전 모니터링 요원입니다. 이 AR 글래스는 나의 1인칭 시점(egocentric viewpoint) 비디오 프레임을 수신합니다. 비디오를 주의 깊게 시청하며 사물의 움직임과 사람의 행동에 집중하십시오. 당신은 비디오의 이전 부분을 볼 수 없으므로, 참고용으로 비디오의 이전 히스토리를 제공합니다. 히스토리는 다음과 같습니다:'
        else:
            system = 'You are an intelligent assistant as well as safety monitor on AR glasses. The AR glasses receive video frames from my egocentric viewpoint. Carefully watch the video and pay attention to the movement of objects, and the action of human. Since you cannot see the previous part of the video, I provide you the history of this video for reference. The history is: '
        res = system
        if sep_chat:
            for hist in history[:-1]:
                ts = hist[0]
                a = hist[1]
                if language == 'kor':
                    res += '비디오가 %.1f초일 때, 내용은 "%s"입니다. ' % (ts, a)
                else:
                    res += 'When the video is at %.1f seconds, the video content is "%s". ' % (ts, a)
            ts = history[-1][0]
            a = history[-1][1]
            if language == 'kor':
                res += '이것은 이전에 발생한 일을 나타내는 히스토리의 끝입니다.\n 현재 비디오는 %.1f초 지점이며, 내용은 "%s"입니다. ' % (ts, a)
            else:
                res += 'This is the end of the history which indicate what have previously happened.\n Now the video is at %.1f seconds, the video content is: "%s". ' % (ts, a)
        else:
            for hist in history:
                ts = hist[0]
                a = hist[1]
                if language == 'kor':
                    res += '비디오가 %.1f초일 때, 내용은 "%s"입니다. ' % (ts, a.strip())
                else:
                    res += 'When the video is at %.1f seconds, the video contect is "%s". ' % (ts, a.strip())
            if language == 'kor':
                res += '이것은 이전에 발생한 일을 나타내는 비디오 히스토리의 끝입니다.\n'
            else:
                res += 'This is the end of the video history that indicates what happened before.\n'

        if language == 'kor':
            res += '현재 비디오와 이전 비디오를 참고하여, 내 질문에 한국어로 답변해 주세요: "%s". 만약 질문이 이전에 수행된 작업에 관한 것이라면 히스토리에만 집중하십시오. 그렇지 않다면 질문과 현재 비디오 입력에만 집중하십시오. 질문이 향후 계획에 관한 것이라면 최대 3단계로 제공하십시오.' % question
        else:
            res += 'Given the current video and using the previous video as reference, answer my question in English: "%s". Note that if the question is about what has been previously done, please only focus on the history. Otherwise, please only focus on the question and the current video input. If the question is about future planning, provide at most 3 steps.' % question
        question = res
    return question

class IntervlChat():

    def __init__(self, sep_chat: bool=False, stream: bool=False, 
                 device: str='cuda:0', language: str='eng', version: str='v1'):
        self.sep_chat = sep_chat
        self.language = language
        self.device = device
        self.stream = stream
        self.version = version
        self.intervl_chat = init_model(sep_chat, stream=self.stream, device=device, language=language, version=version)
        self.origin_intervl_model = self.intervl_chat.model

    # frame是否可以resize
    def load_video_frames(self, frames: list):
        pixel_values_list, num_patches_list = [], []
        for i, frame in enumerate(frames):
            # frame = np.array(frame, dtype=np.uint8)
            img = Image.fromarray(frame).convert('RGB')
            if i == len(frames) - 1:
                img.save('./lastim.jpg')

            img = dynamic_preprocess(img, image_size=448, use_thumbnail=True, max_num=1)
            pixel_values = [self.intervl_chat.transform(tile) for tile in img]
            pixel_values = torch.stack(pixel_values)
            num_patches_list.append(pixel_values.shape[0])
            pixel_values_list.append(pixel_values)
        pixel_values = torch.cat(pixel_values_list)

        return pixel_values, num_patches_list
    
    def _chat(self, model, tokenizer, pixel_values, question: str, num_patches_list: list):
        return model.chat(tokenizer, pixel_values, question, self.intervl_chat.generation_config, 
                          num_patches_list=num_patches_list, history=None, return_history=True)
    
    def _chat_stream(self, model, tokenizer, pixel_values, question: str, generation_config, num_patches_list: list):
        thread = Thread(target=model.chat, kwargs=dict(tokenizer=tokenizer, pixel_values=pixel_values, question=question, generation_config=generation_config, 
                                                       num_patches_list=num_patches_list, history=None, return_history=False))
        thread.start()

        return self.intervl_chat.streamer

    def chat_unsafe_silent(self, question: str, frames: list, history: list=[], timestamp: int=0,):
        """
        Chat interaction in silent mode.

        Args:
        - question (str): 
            The input question string. Currently, this parameter is reconstructed 
            internally rather than being used directly.
        - frames (list): 
            A list of video frames, where each frame represents a specific time point in the video.
        - history (list): 
            Previous chat history, defaulting to an empty list.
        - session_id (str): 
            The unique identifier for the session, defaulting to "default".
        - timestamp (int): 
            The current video timestamp, used for constructing the question and recording history.

        Returns:
        - response (str): 
            The generated response.
        - history (list): 
            The updated chat history, including the newly added response.
        """
        print(f"silent chat history: {history}")
        print(f"silent chat timestamp: {timestamp}")

        lang = getattr(self, 'language', 'eng')

        system_prompts = {
            'eng': 'The video is now at %.1f seconds. As a safety supervisor, briefly describe my actions and identify any hazardous objects or procedural errors.',
            'kor': '현재 동영상이 %.1f초 지점에 있습니다. 안전 감독관으로서 제 행동을 간략히 묘사하고, 위험한 물체나 절차상 오류가 있는지 확인하십시오.'
        }

        prompt_template = system_prompts.get(lang, system_prompts['eng'])
        
        with torch.device(self.device):
            pixel_values, num_patches_list = self.load_video_frames(frames)
            pixel_values = pixel_values.to(torch.bfloat16).cuda()

            video_prefix = ''.join([f'Frame{i+1}: <image>\n' for i in range(len(num_patches_list))])

            question = video_prefix + (prompt_template % timestamp)
            
            response, _history = self._chat(self.origin_intervl_model, self.intervl_chat.tokenizer, pixel_values, question, num_patches_list)
            history.append((timestamp, response))
            # print('VL_HISTORY:', _history)

            # print('Real question at %2.1f is |||' % (timestamp), question)
            # print('Answer at %2.1f is ||| '% (timestamp), response)
            
            return response, history

    def chat_unsafe(self, question: str, frames: list, history: list=[], timestamp: int=0, silent: bool=False):
        """
        Implements chat functionality related to user video content, supporting real-time streaming output.

        Args:
            question (str): The question proposed by the user.
            frames (list): A list of video frame data.
            history (list, optional): Chat history records. Defaults to [].
            timestamp (int, optional): The current timestamp of the video. Defaults to 0.
            silent (bool, optional): Whether to enable silent mode. Defaults to False.

        Description:
            This function loads video frame data onto the device for processing.
            It decides whether to use streaming or non-streaming output to generate a response based on the configuration.
            Chat history is updated and returned.

        사용자 비디오 콘텐츠와 관련된 채팅 기능을 구현하며, 실시간 스트리밍 출력을 지원합니다.

        매개변수:
            question (str): 사용자의 질문.
            frames (list): 비디오 프레임 데이터 목록.
            history (list): 채팅 기록. 기본값은 빈 목록([]).
            timestamp (int): 비디오의 현재 타임스탬프. 기본값은 0.
            silent (bool): 침묵 모드 여부. 기본값은 False.

        설명:
            이 함수는 비디오 프레임 데이터를 디바이스로 로드하여 처리합니다.
            설정에 따라 스트리밍 또는 비스트리밍 출력을 사용하여 답변을 생성합니다.
            채팅 기록이 업데이트되어 반환됩니다.
        """
        print(f"chat history: {history}")
        print(f"chat timestamp: {timestamp}")

        lang = getattr(self, 'language', 'eng')

        prompts = {
            'chn': {
                'action_desc': '现在视频到了 %.1f 秒处. 作为安全助手，描述我的动作并检查是否符合安全规范。',
                'time_prefix': '现在视频到了%.1f秒处. ',
                'safety_system_msg': '你是一个工业安全助手。请监控危险物品，确认步骤是否正确，并在被问及时指导下一步。'
            },
            'eng': {
                'action_desc': 'The video is now at %.1f seconds. As a safety aid, describe my actions and check for compliance with safety protocols.',
                'time_prefix': 'The video is now at %.1f seconds. ',
                'safety_system_msg': 'You are an industrial safety assistant. Monitor for hazardous objects, verify correct process execution, and provide the next step if asked. '
            },
            'kor': {
                'action_desc': '현재 동영상이 %.1f초 지점에 있습니다. 안전 도우미로서 제 행동을 묘사하고 안전 규정 준수 여부를 확인하십시오.',
                'time_prefix': '현재 동영상이 %.1f초 지점에 있습니다. ',
                'safety_system_msg': '당신은 산업 안전 도우미입니다. 위험한 물체를 감시하고, 공정이 올바르게 수행되었는지 확인하며, 요청 시 다음 단계를 안내하십시오. '
            }
        }

        lang_pack = prompts.get(lang, prompts['eng'])

        with torch.device(self.device):
            pixel_values, num_patches_list = self.load_video_frames(frames)
            pixel_values = pixel_values.to(torch.bfloat16).cuda()

            video_prefix = ''.join([f'Frame{i+1}: <image>\n' for i in range(len(num_patches_list))])

            if self.sep_chat:
                quest_suffix = lang_pack['action_desc'] % timestamp
                quest = video_prefix + quest_suffix

                response, _ = self._chat(self.origin_intervl_model, self.intervl_chat.tokenizer, pixel_values, quest, num_patches_list)
                
                history.append((timestamp, response))
                question = add_history(question, history, self.sep_chat, self.language)
#                 question = add_history(question, history)
                
                print(f"chat question: {question}")
                if self.stream:
                    streamer = self._chat_stream(self.intervl_chat.lmmodel, self.intervl_chat.tokenizer, None, question, 
                                                    self.intervl_chat.lmgeneration_config, num_patches_list)
                    
                    for new_text in streamer:
                        if new_text == self.intervl_chat.lmmodel.conv_template.sep:
                            return new_text, history
                        
                        yield new_text, history
                else:
                    response, _ = self._chat(self.intervl_chat.model, self.intervl_chat.tokenizer, None, question, 
                                                self.intervl_chat.generation_config, num_patches_list)
                                    
                    print('Real question at %2.1f is |||' % timestamp, question)
                    print('Answer at %2.1f is ||| '%timestamp, response)

                    yield response, history
            else:
                time_prefix=lang_pack['time_prefix'] % timestamp
                question = lang_pack['safety_system_msg'] + time_prefix + question

                question = add_history(question, history, self.sep_chat)
                question = video_prefix + question

                print(f"chat question: {question}")

                if self.stream:
                    streamer = self._chat_stream(self.intervl_chat.model, self.intervl_chat.tokenizer, pixel_values, question, 
                                                 self.intervl_chat.generation_config, num_patches_list)

                    for new_text in self.intervl_chat.streamer:
                        if new_text == self.intervl_chat.model.conv_template.sep:
                            print(f"set history: {history}")
                            return new_text, history
                        
                        yield new_text, history
                    # response, _ = self._chat(self.intervl_chat.model, self.intervl_chat.tokenizer, pixel_values, question, num_patches_list)
            
                    # print('Real question at %2.1f is |||' % timestamp, question)
                    # print('Answer at %2.1f is ||| '%timestamp, response)

                    # yield response, history
                    
                else:
                    response, _ = self._chat(self.intervl_chat.model, self.intervl_chat.tokenizer, pixel_values, question, num_patches_list)

                    print('Real question at %2.1f is |||' % timestamp, question)
                    print('Answer at %2.1f is ||| '%timestamp, response)

                    yield response, history

# 获取所有可用的CUDA设备
available_devices = [f'cuda:{i}' for i in range(torch.cuda.device_count())]
print(f"available devices: {available_devices}")

sep_chat = False
stream = True
running_language = os.environ.get('RUNNING_LANGUAGE')
version = os.environ.get('VERSION')
if running_language is None:
    running_language = 'eng'
chats = [IntervlChat(sep_chat, stream, device, running_language, version) for device in available_devices]

def get_timestamp(session_id: str):
    current_timestamp = time.time()

    first_timestamp = first_chat_timestamp_cache.get(session_id)
    if first_timestamp:
        return int(current_timestamp) - int(first_timestamp)

    first_chat_timestamp_cache.put(session_id, current_timestamp)

    return 0

def get_history(session_id: str):
    history = history_cache.get(session_id)
    if not history:
        return []
    
    return history[-10:]

def chat(question: str, frames: list, history: list=[], session_id: str="default", 
         timestamp: int=0, silent: bool=False, model_index: int=0):
    print(f"session id: {session_id}")

    chat = chats[model_index]
    timestamp = get_timestamp(session_id)
    history = get_history(session_id)

    if silent:
        response, history = chat.chat_unsafe_silent(question, frames, history, timestamp=timestamp)
        
        # 记录历史
        print(f"set silent history: {history}")
        history_cache.put(session_id, history)

        return response, history
                    
    answers = chat.chat_unsafe(question, frames, history, timestamp=timestamp, silent=silent)
    
    generate_txt = ''
    history = []
    for answer, history in answers:
        generate_txt += answer
        history = history
    
    # 记录历史
    print(f"set history: {history}")
    history_cache.put(session_id, history)

    return generate_txt, history

def stream_chat(question: str, frames: list, history: list, session_id: str="default", 
                timestamp: int=0, silent: bool=False, model_index: int=0):
    print(f"session id: {session_id}")

    chat = chats[model_index]
    timestamp = get_timestamp(session_id)
    history = get_history(session_id)

    if silent:
        response, history = chat.chat_unsafe_silent(question, frames, history, timestamp=timestamp)

        # 记录历史
        print(f"set silent history: {history}")
        history_cache.put(session_id, history)

        yield response, history
        return
    
    answers = chat.chat_unsafe(question, frames, history, timestamp=timestamp, silent=silent)
    
    generate_txt = ''
    for answer, history in answers:
        generate_txt += answer
        yield generate_txt, history

    # 记录历史
    print(f"set history: {history}")
    history_cache.put(session_id, history)

    print(f"chat answer: {generate_txt}")