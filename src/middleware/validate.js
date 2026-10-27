import { cleanupUploadedFiles } from "./uploadProjectReview.js";

export function validate(schema, source = "body") {
  return async (request, response, next) => {
    const { value, error } = schema.validate(request[source], {
      abortEarly: false,
      allowUnknown: false,
      convert: true,
    });

    if (error) {
      await cleanupUploadedFiles(request.files);

      return response.status(400).json({
        message: "Validation failed",
        errors: error.details.map((entry) => ({
          field: entry.path.join("."),
          message: entry.message,
        })),
      });
    }

    if (source === "query") {
      request.validatedQuery = value;
    } else {
      request[source] = value;
    }

    next();
  };
}
