import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

// Smart Assistant API calls
export const useSmartAssistant = () => {
  const queryClient = useQueryClient();

  const searchMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await api.request('/assistant/smart-search', {
        method: 'POST',
        body: { message }
      });
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['assistant-results'] });
    },
  });

  return searchMutation;
};

// Parse input only (for debugging)
export const useParseInput = () => {
  return useMutation({
    mutationFn: async (message: string) => {
      const response = await api.post('/assistant/parse-only', { message });
      return response.data;
    },
  });
};
