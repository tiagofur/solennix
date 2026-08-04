import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  requestLinkService,
  type CreatePublicRequestLinkRequest,
} from "@/services/requestLinkService";
import { queryKeys } from "./queryKeys";

export function useRequestLinks() {
  return useQuery({
    queryKey: queryKeys.requestLinks.all,
    queryFn: () => requestLinkService.listLinks(),
  });
}

export function useCreateRequestLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreatePublicRequestLinkRequest) =>
      requestLinkService.createLink(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.requestLinks.all });
    },
  });
}

export function useRevokeRequestLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => requestLinkService.revokeLink(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.requestLinks.all });
    },
  });
}
