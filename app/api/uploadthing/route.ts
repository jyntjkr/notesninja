import { createNextRouteHandler } from "uploadthing/next";
import { ourFileRouter } from "./core";

// Export a GET and POST handler for the API route
export const { GET, POST } = createNextRouteHandler({
  router: ourFileRouter,
}); 