import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { reportsApi } from "@/lib/api/services";

export function useCreatePdfReport(projectId: string) {
  return useMutation({
    mutationFn: (data?: Parameters<typeof reportsApi.createPdf>[1]) =>
      reportsApi.createPdf(projectId, data),
  });
}

export function useCreateExcelReport(projectId: string) {
  return useMutation({
    mutationFn: (data?: Parameters<typeof reportsApi.createExcel>[1]) =>
      reportsApi.createExcel(projectId, data),
  });
}

export function useDownloadReport(projectId: string) {
  return useMutation({
    mutationFn: async (reportId: string) => {
      const blob = await reportsApi.download(projectId, reportId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `report-${reportId}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
  });
}

export function useEmailSchedules(projectId: string) {
  return useQuery({
    queryKey: ["email-schedules", projectId],
    queryFn: () => reportsApi.getEmailSchedules(projectId),
    enabled: !!projectId,
  });
}

export function useCreateEmailSchedule(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof reportsApi.createEmailSchedule>[1]) =>
      reportsApi.createEmailSchedule(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-schedules", projectId] });
    },
  });
}

export function useUpdateEmailSchedule(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ scheduleId, data }: { scheduleId: string; data: Parameters<typeof reportsApi.updateEmailSchedule>[2] }) =>
      reportsApi.updateEmailSchedule(projectId, scheduleId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-schedules", projectId] });
    },
  });
}

export function useDeleteEmailSchedule(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (scheduleId: string) => reportsApi.deleteEmailSchedule(projectId, scheduleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-schedules", projectId] });
    },
  });
}

export function useSendEmailScheduleNow(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (scheduleId: string) => reportsApi.sendEmailScheduleNow(projectId, scheduleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-schedules", projectId] });
    },
  });
}
