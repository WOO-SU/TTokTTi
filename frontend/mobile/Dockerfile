FROM openjdk:17-jdk-slim

# 1. Setup Environment Variables
ENV ANDROID_SDK_ROOT /opt/android-sdk
ENV PATH ${PATH}:${ANDROID_SDK_ROOT}/cmdline-tools/latest/bin:${ANDROID_SDK_ROOT}/platform-tools

# 2. Install dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget unzip git \
    && rm -rf /var/lib/apt/lists/*

# 3. Download Android Command Line Tools
WORKDIR /opt/android-sdk/cmdline-tools
RUN wget -q https://dl.google.com/android/repository/commandlinetools-linux-9477386_latest.zip \
    && unzip commandlinetools-linux-*.zip \
    && mv cmdline-tools latest \
    && rm commandlinetools-linux-*.zip

# 4. Accept Licenses and Install SDK Platforms (Adjust versions as needed)
RUN yes | sdkmanager --licenses > /dev/null \
    && sdkmanager "platform-tools" "platforms;android-33" "build-tools;33.0.0"

WORKDIR /project