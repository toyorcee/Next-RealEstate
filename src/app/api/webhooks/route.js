import { Webhook } from "svix";
import { headers } from "next/headers";
import { clerkClient } from "@clerk/nextjs/server";
import { createOrUpdateUser, deleteUser } from "../../../lib/actions/user";

export async function POST(req) {
  const SIGNING_SECRET = process.env.SIGNING_SECRET;
  if (!SIGNING_SECRET) {
    throw new Error("Missing SIGNING_SECRET in environment variables");
  }

  const wh = new Webhook(SIGNING_SECRET);
  const headerPayload = headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Missing Svix headers", { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  let evt;
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    });
  } catch {
    return new Response("Verification failed", { status: 400 });
  }

  const { id } = evt?.data;
  const eventType = evt?.type;

  if (eventType === "user.created" || eventType === "user.updated") {
    const { first_name, last_name, image_url, email_addresses } = evt?.data;
    try {
      const user = await createOrUpdateUser(
        id,
        first_name,
        last_name,
        image_url,
        email_addresses
      );
      if (user && eventType === "user.created") {
        try {
          await clerkClient.updateUserMetadata(id, {
            publicMetadata: { userMongoId: user._id },
          });
        } catch {
          return new Response("Failed to update Clerk metadata", {
            status: 400,
          });
        }
      }
    } catch {
      return new Response("Failed to create/update user", { status: 400 });
    }
  }

  if (eventType === "user.deleted") {
    try {
      await deleteUser(id);
    } catch {
      return new Response("Failed to delete user", { status: 400 });
    }
  }

  return new Response("Webhook received", { status: 200 });
}
