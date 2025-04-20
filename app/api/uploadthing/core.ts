import { createUploadthing, type FileRouter } from "uploadthing/next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

// Create an uploadthing instance
const f = createUploadthing();

// Define middleware to check authentication
const auth = async () => {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    throw new Error("Unauthorized");
  }

  return { 
    id: session.user.id,
    role: session.user.role 
  };
};

// FileRouter for your app, can contain multiple file routes
export const ourFileRouter = {
  // Define a file route for teacher documents
  teacherDocumentUploader: f({
    pdf: { maxFileSize: "16MB", maxFileCount: 1 },
    image: { maxFileSize: "8MB", maxFileCount: 1 },
    text: { maxFileSize: "4MB", maxFileCount: 1 },
  })
    .middleware(async () => {
      // Verify user is authenticated and a teacher
      const user = await auth();
      
      if (user.role !== "TEACHER") {
        throw new Error("Only teachers can upload materials");
      }
      
      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // This code runs after the file is uploaded to uploadthing
      console.log("Upload complete for teacher:", metadata.userId);
      console.log("File URL:", file.url);
      
      // In newer versions of UploadThing, don't return data here
      // The client already receives file data automatically
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter; 