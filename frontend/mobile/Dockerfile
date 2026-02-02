FROM eclipse-temurin:17-jdk-jammy

# 1. Setup Environment Variables
ENV ANDROID_SDK_ROOT /opt/android-sdk
ENV PATH ${PATH}:${ANDROID_SDK_ROOT}/cmdline-tools/latest/bin:${ANDROID_SDK_ROOT}/platform-tools

# 2. Install dependencies
RUN apt-get update && apt-get install -y \
    curl wget unzip git \ 
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt install -y nodejs
# && rm -rf /var/lib/apt/lists/*

# 3. Download Android Command Line Tools
WORKDIR /opt/android-sdk/cmdline-tools
RUN wget -q https://dl.google.com/android/repository/commandlinetools-linux-9477386_latest.zip \
    && unzip commandlinetools-linux-*.zip \
    && mv cmdline-tools latest \
    && rm commandlinetools-linux-*.zip

# 4. Accept Licenses and Install SDK Platforms (Adjust versions as needed)
RUN yes | sdkmanager --licenses > /dev/null \
    && sdkmanager "platform-tools" "platforms;android-33" "build-tools;33.0.0"

WORKDIR /app
COPY . .

RUN npm install

# APK 빌드
WORKDIR /app/android
RUN chmod +x gradlew
RUN ./gradlew assembleRelease