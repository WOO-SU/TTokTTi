class SceneState:
    def __init__(self):
        self.outriggers = {}      # track_id -> OuttriggerState
        self.any_outtrigger = False
