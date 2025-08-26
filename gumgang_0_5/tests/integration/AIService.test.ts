/**
 * 금강 2.0 - AI 서비스 통합 테스트
 * AI 모델 연동 및 프롬프트 처리 테스트
 */

import { AIService } from '../../gumgang-v2/src/services/AIService';
import { mockApiResponse, wait, flushPromises } from '../setupTests';

// 모킹된 모델 응답 데이터
const mockModelResponses = {
  gpt4: {
    id: 'chatcmpl-test-gpt4',
    object: 'chat.completion',
    created: 1625000000,
    model: 'gpt-4',
    choices: [{
      index: 0,
      message: {
        role: 'assistant',
        content: '이것은 GPT-4 모델의 응답입니다.',
      },
      finish_reason: 'stop',
    }],
    usage: {
      prompt_tokens: 100,
      completion_tokens: 50,
      total_tokens: 150,
    },
  },
  claude: {
    id: 'msg_test_claude',
    type: 'message',
    role: 'assistant',
    content: [{
      type: 'text',
      text: '이것은 Claude 모델의 응답입니다.',
    }],
    model: 'claude-3-opus',
    stop_reason: 'end_turn',
    usage: {
      input_tokens: 100,
      output_tokens: 50,
    },
  },
  gemini: {
    candidates: [{
      content: {
        parts: [{
          text: '이것은 Gemini 모델의 응답입니다.',
        }],
        role: 'model',
      },
      finishReason: 'STOP',
    }],
    usageMetadata: {
      promptTokenCount: 100,
      candidatesTokenCount: 50,
      totalTokenCount: 150,
    },
  },
};

describe('AIService 통합 테스트', () => {
  let aiService: AIService;

  beforeEach(() => {
    // AIService 인스턴스 초기화
    aiService = AIService.getInstance();
    aiService.reset();

    // fetch 모킹 초기화
    (global.fetch as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('서비스 초기화', () => {
    test('싱글톤 패턴으로 인스턴스 생성', () => {
      const instance1 = AIService.getInstance();
      const instance2 = AIService.getInstance();
      expect(instance1).toBe(instance2);
    });

    test('API 키 설정 및 검증', () => {
      const config = {
        openaiKey: 'test-openai-key',
        claudeKey: 'test-claude-key',
        geminiKey: 'test-gemini-key',
      };

      aiService.initialize(config);
      expect(aiService.isInitialized()).toBe(true);
      expect(aiService.getAvailableModels()).toContain('gpt-4');
      expect(aiService.getAvailableModels()).toContain('claude-3-opus');
      expect(aiService.getAvailableModels()).toContain('gemini-pro');
    });

    test('API 키 없이 초기화 시 에러', () => {
      expect(() => {
        aiService.initialize({});
      }).toThrow('At least one API key must be provided');
    });
  });

  describe('모델 전환', () => {
    beforeEach(() => {
      aiService.initialize({
        openaiKey: 'test-key',
        claudeKey: 'test-key',
        geminiKey: 'test-key',
      });
    });

    test('GPT-4 모델로 전환', async () => {
      await aiService.switchModel('gpt-4');
      expect(aiService.getCurrentModel()).toBe('gpt-4');
    });

    test('Claude 모델로 전환', async () => {
      await aiService.switchModel('claude-3-opus');
      expect(aiService.getCurrentModel()).toBe('claude-3-opus');
    });

    test('Gemini 모델로 전환', async () => {
      await aiService.switchModel('gemini-pro');
      expect(aiService.getCurrentModel()).toBe('gemini-pro');
    });

    test('지원하지 않는 모델로 전환 시 에러', async () => {
      await expect(aiService.switchModel('invalid-model')).rejects.toThrow(
        'Model not available: invalid-model'
      );
    });

    test('API 키가 없는 모델로 전환 시 에러', async () => {
      aiService.initialize({ openaiKey: 'test-key' });
      await expect(aiService.switchModel('claude-3-opus')).rejects.toThrow(
        'API key not configured for model: claude-3-opus'
      );
    });
  });

  describe('프롬프트 처리', () => {
    beforeEach(() => {
      aiService.initialize({
        openaiKey: 'test-openai-key',
        claudeKey: 'test-claude-key',
        geminiKey: 'test-gemini-key',
      });
    });

    test('GPT-4 모델로 프롬프트 전송', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(
        mockApiResponse(mockModelResponses.gpt4)
      );

      await aiService.switchModel('gpt-4');
      const response = await aiService.sendPrompt('테스트 프롬프트');

      expect(fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-openai-key',
            'Content-Type': 'application/json',
          }),
          body: expect.stringContaining('테스트 프롬프트'),
        })
      );

      expect(response.content).toBe('이것은 GPT-4 모델의 응답입니다.');
      expect(response.model).toBe('gpt-4');
      expect(response.tokens.total).toBe(150);
    });

    test('Claude 모델로 프롬프트 전송', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(
        mockApiResponse(mockModelResponses.claude)
      );

      await aiService.switchModel('claude-3-opus');
      const response = await aiService.sendPrompt('테스트 프롬프트');

      expect(fetch).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'x-api-key': 'test-claude-key',
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          }),
          body: expect.stringContaining('테스트 프롬프트'),
        })
      );

      expect(response.content).toBe('이것은 Claude 모델의 응답입니다.');
      expect(response.model).toBe('claude-3-opus');
      expect(response.tokens.total).toBe(150);
    });

    test('Gemini 모델로 프롬프트 전송', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(
        mockApiResponse(mockModelResponses.gemini)
      );

      await aiService.switchModel('gemini-pro');
      const response = await aiService.sendPrompt('테스트 프롬프트');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('generativelanguage.googleapis.com'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: expect.stringContaining('테스트 프롬프트'),
        })
      );

      expect(response.content).toBe('이것은 Gemini 모델의 응답입니다.');
      expect(response.model).toBe('gemini-pro');
      expect(response.tokens.total).toBe(150);
    });

    test('빈 프롬프트 전송 시 에러', async () => {
      await aiService.switchModel('gpt-4');
      await expect(aiService.sendPrompt('')).rejects.toThrow(
        'Prompt cannot be empty'
      );
    });

    test('네트워크 에러 처리', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      );

      await aiService.switchModel('gpt-4');
      await expect(aiService.sendPrompt('테스트')).rejects.toThrow(
        'Network error'
      );
    });

    test('API 에러 응답 처리', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(
        mockApiResponse(
          { error: { message: 'Invalid API key' } },
          401
        )
      );

      await aiService.switchModel('gpt-4');
      await expect(aiService.sendPrompt('테스트')).rejects.toThrow(
        'API Error: Invalid API key'
      );
    });
  });

  describe('스트리밍 응답', () => {
    test('GPT-4 스트리밍 응답 처리', async () => {
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"안녕"}}]}\n\n'));
          controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"하세요"}}]}\n\n'));
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
          controller.close();
        },
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: mockStream,
        headers: new Headers(),
      });

      aiService.initialize({ openaiKey: 'test-key' });
      await aiService.switchModel('gpt-4');

      const chunks: string[] = [];
      await aiService.streamPrompt('테스트', (chunk) => {
        chunks.push(chunk);
      });

      expect(chunks).toEqual(['안녕', '하세요']);
    });

    test('스트리밍 중 에러 처리', async () => {
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"테스트"}}]}\n\n'));
          controller.error(new Error('Stream interrupted'));
        },
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: mockStream,
        headers: new Headers(),
      });

      aiService.initialize({ openaiKey: 'test-key' });
      await aiService.switchModel('gpt-4');

      const chunks: string[] = [];
      await expect(
        aiService.streamPrompt('테스트', (chunk) => chunks.push(chunk))
      ).rejects.toThrow('Stream interrupted');

      expect(chunks).toEqual(['테스트']);
    });
  });

  describe('컨텍스트 관리', () => {
    beforeEach(() => {
      aiService.initialize({ openaiKey: 'test-key' });
    });

    test('대화 히스토리 유지', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(mockApiResponse(mockModelResponses.gpt4))
        .mockResolvedValueOnce(mockApiResponse({
          ...mockModelResponses.gpt4,
          choices: [{
            ...mockModelResponses.gpt4.choices[0],
            message: {
              role: 'assistant',
              content: '두 번째 응답입니다.',
            },
          }],
        }));

      await aiService.switchModel('gpt-4');

      // 첫 번째 대화
      await aiService.sendPrompt('첫 번째 질문');

      // 두 번째 대화 (컨텍스트 포함)
      await aiService.sendPrompt('두 번째 질문', { includeHistory: true });

      // 두 번째 요청에 히스토리가 포함되었는지 확인
      const secondCall = (global.fetch as jest.Mock).mock.calls[1];
      const body = JSON.parse(secondCall[1].body);

      expect(body.messages).toHaveLength(4); // system + 첫 질문 + 첫 응답 + 두 번째 질문
      expect(body.messages[1].content).toBe('첫 번째 질문');
      expect(body.messages[2].content).toBe('이것은 GPT-4 모델의 응답입니다.');
    });

    test('대화 히스토리 초기화', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        mockApiResponse(mockModelResponses.gpt4)
      );

      await aiService.switchModel('gpt-4');

      // 대화 생성
      await aiService.sendPrompt('질문 1');
      await aiService.sendPrompt('질문 2', { includeHistory: true });

      // 히스토리 초기화
      aiService.clearHistory();

      // 새로운 대화
      await aiService.sendPrompt('질문 3', { includeHistory: true });

      const lastCall = (global.fetch as jest.Mock).mock.calls[2];
      const body = JSON.parse(lastCall[1].body);

      expect(body.messages).toHaveLength(2); // system + 질문 3만
    });

    test('최대 컨텍스트 길이 제한', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        mockApiResponse(mockModelResponses.gpt4)
      );

      await aiService.switchModel('gpt-4');
      aiService.setMaxContextLength(100);

      // 긴 대화 히스토리 생성
      for (let i = 0; i < 10; i++) {
        await aiService.sendPrompt(`질문 ${i}`, { includeHistory: true });
      }

      const lastCall = (global.fetch as jest.Mock).mock.calls[9];
      const body = JSON.parse(lastCall[1].body);

      // 컨텍스트가 제한되었는지 확인
      const totalLength = JSON.stringify(body.messages).length;
      expect(totalLength).toBeLessThanOrEqual(500); // 적절한 제한
    });
  });

  describe('토큰 관리', () => {
    beforeEach(() => {
      aiService.initialize({ openaiKey: 'test-key' });
    });

    test('토큰 사용량 추적', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(mockApiResponse(mockModelResponses.gpt4))
        .mockResolvedValueOnce(mockApiResponse(mockModelResponses.gpt4));

      await aiService.switchModel('gpt-4');

      await aiService.sendPrompt('첫 번째 질문');
      await aiService.sendPrompt('두 번째 질문');

      const usage = aiService.getTokenUsage();

      expect(usage.total).toBe(300); // 150 + 150
      expect(usage.prompt).toBe(200); // 100 + 100
      expect(usage.completion).toBe(100); // 50 + 50
      expect(usage.requests).toBe(2);
    });

    test('토큰 제한 설정 및 확인', async () => {
      aiService.setTokenLimit(200);

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(mockApiResponse(mockModelResponses.gpt4))
        .mockResolvedValueOnce(mockApiResponse(mockModelResponses.gpt4));

      await aiService.switchModel('gpt-4');

      await aiService.sendPrompt('첫 번째 질문');

      // 토큰 제한 초과 시 에러
      await expect(aiService.sendPrompt('두 번째 질문')).rejects.toThrow(
        'Token limit exceeded'
      );
    });

    test('토큰 사용량 리셋', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        mockApiResponse(mockModelResponses.gpt4)
      );

      await aiService.switchModel('gpt-4');
      await aiService.sendPrompt('질문');

      expect(aiService.getTokenUsage().total).toBe(150);

      aiService.resetTokenUsage();

      expect(aiService.getTokenUsage().total).toBe(0);
    });
  });

  describe('모델별 특수 기능', () => {
    test('GPT-4 함수 호출', async () => {
      const mockFunctionResponse = {
        ...mockModelResponses.gpt4,
        choices: [{
          ...mockModelResponses.gpt4.choices[0],
          message: {
            role: 'assistant',
            content: null,
            function_call: {
              name: 'get_weather',
              arguments: '{"location": "Seoul"}',
            },
          },
        }],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce(
        mockApiResponse(mockFunctionResponse)
      );

      aiService.initialize({ openaiKey: 'test-key' });
      await aiService.switchModel('gpt-4');

      const functions = [{
        name: 'get_weather',
        description: 'Get weather information',
        parameters: {
          type: 'object',
          properties: {
            location: { type: 'string' },
          },
        },
      }];

      const response = await aiService.sendPrompt(
        '서울 날씨 알려줘',
        { functions }
      );

      expect(response.functionCall).toBeDefined();
      expect(response.functionCall.name).toBe('get_weather');
      expect(response.functionCall.arguments).toEqual({ location: 'Seoul' });
    });

    test('Claude 시스템 프롬프트 설정', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(
        mockApiResponse(mockModelResponses.claude)
      );

      aiService.initialize({ claudeKey: 'test-key' });
      await aiService.switchModel('claude-3-opus');

      const systemPrompt = '당신은 코드 리뷰 전문가입니다.';
      await aiService.sendPrompt('이 코드 리뷰해줘', { systemPrompt });

      const call = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(call[1].body);

      expect(body.system).toBe(systemPrompt);
    });

    test('Gemini 멀티모달 입력', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(
        mockApiResponse(mockModelResponses.gemini)
      );

      aiService.initialize({ geminiKey: 'test-key' });
      await aiService.switchModel('gemini-pro');

      const imageData = 'base64_encoded_image_data';
      await aiService.sendPrompt('이 이미지 설명해줘', {
        attachments: [{
          type: 'image',
          data: imageData,
        }],
      });

      const call = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(call[1].body);

      expect(body.contents[0].parts).toHaveLength(2);
      expect(body.contents[0].parts[1].inlineData).toBeDefined();
    });
  });

  describe('에러 복구 및 재시도', () => {
    beforeEach(() => {
      aiService.initialize({ openaiKey: 'test-key' });
    });

    test('일시적 에러 시 재시도', async () => {
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce(mockApiResponse(mockModelResponses.gpt4));

      await aiService.switchModel('gpt-4');
      aiService.setRetryConfig({ maxRetries: 3, retryDelay: 10 });

      const response = await aiService.sendPrompt('테스트');

      expect(fetch).toHaveBeenCalledTimes(3);
      expect(response.content).toBe('이것은 GPT-4 모델의 응답입니다.');
    });

    test('최대 재시도 횟수 초과', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(
        new Error('Network timeout')
      );

      await aiService.switchModel('gpt-4');
      aiService.setRetryConfig({ maxRetries: 2, retryDelay: 10 });

      await expect(aiService.sendPrompt('테스트')).rejects.toThrow(
        'Max retries exceeded'
      );

      expect(fetch).toHaveBeenCalledTimes(3); // 초기 시도 + 2번 재시도
    });

    test('Rate limit 에러 시 백오프', async () => {
      const rateLimitResponse = {
        ok: false,
        status: 429,
        json: () => Promise.resolve({
          error: { message: 'Rate limit exceeded' },
        }),
        headers: new Headers({ 'Retry-After': '2' }),
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(rateLimitResponse)
        .mockResolvedValueOnce(mockApiResponse(mockModelResponses.gpt4));

      await aiService.switchModel('gpt-4');

      const startTime = Date.now();
      const response = await aiService.sendPrompt('테스트');
      const endTime = Date.now();

      expect(endTime - startTime).toBeGreaterThanOrEqual(2000);
      expect(response.content).toBe('이것은 GPT-4 모델의 응답입니다.');
    });
  });

  describe('성능 최적화', () => {
    test('응답 캐싱', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(
        mockApiResponse(mockModelResponses.gpt4)
      );

      aiService.initialize({ openaiKey: 'test-key' });
      await aiService.switchModel('gpt-4');
      aiService.enableCaching(true);

      // 첫 번째 요청
      const response1 = await aiService.sendPrompt('동일한 질문');

      // 두 번째 요청 (캐시된 응답)
      const response2 = await aiService.sendPrompt('동일한 질문');

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(response1).toEqual(response2);
    });

    test('캐시 만료', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(mockApiResponse(mockModelResponses.gpt4))
        .mockResolvedValueOnce(mockApiResponse({
          ...mockModelResponses.gpt4,
          choices: [{
            ...mockModelResponses.gpt4.choices[0],
            message: {
              role: 'assistant',
              content: '새로운 응답',
            },
          }],
        }));

      aiService.initialize({ openaiKey: 'test-key' });
      await aiService.switchModel('gpt-4');
      aiService.enableCaching(true, { ttl: 100 }); // 100ms TTL

      const response1 = await aiService.sendPrompt('질문');
      await wait(150); // TTL 초과 대기
      const response2 = await aiService.sendPrompt('질문');

      expect(fetch).toHaveBeenCalledTimes(2);
      expect(response1.content).not.toBe(response2.content);
    });

    test('배치 요청 처리', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(
        mockApiResponse({
          responses: [
            mockModelResponses.gpt4,
            mockModelResponses.gpt4,
            mockModelResponses.gpt4,
          ],
        })
      );

      aiService.initialize({ openaiKey: 'test-key' });
      await aiService.switchModel('gpt-4');

      const prompts = ['질문1', '질문2', '질문3'];
      const responses = await aiService.sendBatchPrompts(prompts);

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(responses).toHaveLength(3);
      expect(responses.every(r => r.content === '이것은 GPT-4 모델의 응답입니다.')).toBe(true);
    });
  });
});
