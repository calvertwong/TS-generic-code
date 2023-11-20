import * as dotenv from "dotenv";
dotenv.config();
import express from "express";
import {
  S3Client,
  GetObjectCommand,
  GetObjectCommandOutput,
} from "@aws-sdk/client-s3";
import path from "path";
import {writeFile} from "fs/promises"

const app = express();
app.use(express.json())
app.use(express.urlencoded({extended: true}))

const s3Client =
  process.env.AWS_REGION !== undefined &&
  process.env.AWS_ACCESS_KEY !== undefined &&
  process.env.AWS_SECRET_ACCESS_KEY !== undefined
    ? new S3Client({
        region: process.env.AWS_REGION || "",
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY || "",
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
        },
      })
    : undefined;

app.post("/s3-download", async function (req, res) {
  const fileKeys: Array<string> = req.body.fileKeys;
  if (
    s3Client !== undefined &&
    process.env.S3_BUCKET_NAME !== undefined &&
    fileKeys !== undefined
  ) {
    try {
      const downloadFromS3Calls: Promise<GetObjectCommandOutput>[] = fileKeys.map(
        async (fileKey: string) => {
          const params = {
            Bucket: process.env.S3_BUCKET_NAME,
            Key: fileKey,
            ServerSideEncryption: "AES256"
          };

          return await s3Client.send(new GetObjectCommand(params));
        }
      );

      const downloadFromS3Responses = await Promise.allSettled(
        downloadFromS3Calls
      );

      const downloadedFiles: string[] = [];
      const notDownloadedFiles: string[] = [];

      for (let i = 0; i < downloadFromS3Responses.length; i++) {
        if (downloadFromS3Responses[i].status === "fulfilled") {
          const fileData: Uint8Array = await (downloadFromS3Responses[i] as PromiseFulfilledResult<GetObjectCommandOutput>).value.Body!.transformToByteArray()
            await writeFile(path.join(__dirname + "/" + fileKeys[i]), fileData)
          
          downloadedFiles.push(fileKeys[i]);
        } else {
          console.log((downloadFromS3Responses[i] as PromiseRejectedResult).reason)
          notDownloadedFiles.push(fileKeys[i]);
        }
      }
      res.status(200).send({
        message:
          notDownloadedFiles.length !== 0
            ? "Some files were not downloaded successfully"
            : "Files downloaded successfully",
        downloadedFiles: downloadedFiles,
        notDownloadedFiles: notDownloadedFiles,
      });
    } catch (e) {
      res.status(500).send("Error downloading files");
    }
  } else {
    res.status(400).send("Bad request");
  }
});

app.listen(3002, () => {
  console.log("Server running on port 3002...");
});
