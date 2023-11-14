import { NextFunction, Request, Response } from "express";
import { upload } from "./common-multer-code";
import multer from "multer";

export function MultipleFileUpload(fieldName: string) {
  return function (req: Request, res: Response, next: NextFunction) {
    upload.array(fieldName)(req, res, function (err) {
      if (err instanceof multer.MulterError) {
        // do something
      } else if (err instanceof Error) {
        // do something with err.message
      } else if (err) {
        // do something
      } else {
        if (!req.files) {
          // do something (No file is being uploaded as payload)
        } else {
          next();
        }
      }
    });
  };
}
