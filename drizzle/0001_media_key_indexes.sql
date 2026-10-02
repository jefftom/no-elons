CREATE INDEX "post_media_storage_key_idx" ON "post_media" USING btree ("storage_key");--> statement-breakpoint
CREATE INDEX "post_media_thumb_key_idx" ON "post_media" USING btree ("thumb_key");