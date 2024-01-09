import { getPicInfo, getMediaDuration, getVideoSnshot } from "@/utils/common";
import { v4 as uuidV4 } from "uuid";
import { MessageType } from "open-im-sdk-wasm";
import { IMSDK } from "@/utils/imCommon";
import { showFailToast } from "vant";
import type { MessageItem } from "open-im-sdk-wasm/lib/types/entity";

export default function useCreateFileMessage() {
  const { t } = useI18n();

  const getFileData = (data: Blob): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
      let reader = new FileReader();
      reader.onload = function () {
        resolve(reader.result as ArrayBuffer);
      };
      reader.readAsArrayBuffer(data);
    });
  };

  const getFileType = (name: string) => {
    const idx = name.lastIndexOf(".");
    return name.slice(idx + 1);
  };

  const getImageMessage = async (file: File): Promise<MessageItem> => {
    const { width, height } = await getPicInfo(file);
    const baseInfo = {
      uuid: uuidV4(),
      type: getFileType(file.name),
      size: file.size,
      width,
      height,
      url: URL.createObjectURL(file),
    };
    const options = {
      sourcePicture: baseInfo,
      bigPicture: baseInfo,
      snapshotPicture: baseInfo,
      sourcePath: "",
      file,
    };
    return (await IMSDK.createImageMessageByFile(options)).data;
  };

  const getVideoMessage = async (
    file: File,
    snapShotFile: File
  ): Promise<MessageItem> => {
    const { width, height } = await getPicInfo(snapShotFile);
    const options = {
      videoFile: file,
      snapshotFile: snapShotFile,
      videoPath: "",
      duration: await getMediaDuration(URL.createObjectURL(file)),
      videoType: getFileType(file.name),
      snapshotPath: "",
      videoUUID: uuidV4(),
      videoUrl: "",
      videoSize: file.size,
      snapshotUUID: uuidV4(),
      snapshotSize: snapShotFile.size,
      snapshotUrl: URL.createObjectURL(snapShotFile),
      snapshotWidth: width,
      snapshotHeight: height,
      snapShotType: getFileType(file.name),
    };
    return (await IMSDK.createVideoMessageByFile(options)).data;
  };

  const createFileMessage = async (
    file: File,
    messageType: MessageType,
    duration?: number
  ) => {
    let snapShotFile = undefined;
    if (messageType === MessageType.VideoMessage) {
      try {
        snapShotFile = await getVideoSnshot(URL.createObjectURL(file));
      } catch (error) {
        showFailToast(t("messageTip.generateImageFailed"));
        console.error("get video snapShotFile failed: " + error);
        return {
          error: "get video snapShotFile failed",
        };
      }
    }
    switch (messageType) {
      case MessageType.PictureMessage:
        return {
          message: await getImageMessage(file),
          buffer: await getFileData(file),
        };
      case MessageType.VideoMessage:
        return {
          message: await getVideoMessage(file, snapShotFile!),
          buffer: await getFileData(file),
          snapBuffer: await getFileData(snapShotFile!),
        };
      default:
        return {
          error: "message type error",
        };
    }
  };

  return {
    createFileMessage,
  };
}
