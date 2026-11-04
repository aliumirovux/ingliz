#!/usr/bin/env bash
# Android widget ilovasini yig'ish (Gradle'siz): aapt2 → javac -nowarn -Xlint:-options -source 8 -target 8 -bootclasspath $JAR -classpath $JAR:$BT/core-lambda-stubs.jar -d build/classes $(find build/gen src -name '*.java')
# Kerak: ANDROID_SDK (platforms;android-35, build-tools;35.0.0), KS (keystore yo'li), KS_PASS.
set -euo pipefail
cd "$(dirname "$0")"
SDK=${ANDROID_SDK:-/home/claude/android-sdk}; BT=$SDK/build-tools/35.0.0; JAR=$SDK/platforms/android-35/android.jar
VC=${VERSION_CODE:-1}; VN=${VERSION_NAME:-1.0}
rm -rf build && mkdir -p build/gen build/classes build/dex
$BT/aapt2 compile --dir res -o build/res.zip
$BT/aapt2 link -I $JAR --manifest AndroidManifest.xml -o build/base.apk --java build/gen build/res.zip \
  --min-sdk-version 26 --target-sdk-version 35 --version-code $VC --version-name $VN
javac -nowarn -Xlint:-options -source 8 -target 8 -bootclasspath $JAR -classpath $JAR:$BT/core-lambda-stubs.jar -d build/classes $(find build/gen src -name '*.java')
$BT/d8 --release --lib $JAR --min-api 26 --output build/dex $(find build/classes -name '*.class')
(cd build/dex && zip -q -u ../base.apk classes.dex)
$BT/zipalign -p -f 4 build/base.apk build/aligned.apk
$BT/apksigner sign --ks "$KS" --ks-pass "pass:$KS_PASS" --out ../ingliz-takror.apk build/aligned.apk
$BT/apksigner verify ../ingliz-takror.apk && ls -l ../ingliz-takror.apk
