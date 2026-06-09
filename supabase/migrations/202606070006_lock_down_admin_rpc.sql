revoke execute on function public.merge_duplicate_papers(uuid, uuid, uuid)
from public, anon, authenticated;

grant execute on function public.merge_duplicate_papers(uuid, uuid, uuid)
to service_role;
