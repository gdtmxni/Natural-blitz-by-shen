-- public bucket for Shen's gallery photos and videos (uploads only via signed URLs from the server)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gallery', 'gallery', true, 52428800,
        array['image/webp','image/jpeg','image/png','video/mp4','video/quicktime','video/webm'])
on conflict (id) do nothing;
