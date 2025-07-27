import { 
  getSlackClient, 
  getCacheStats, 
  clearClientCache,
  clearAllClientCache,
  handleInvalidAuth,
  initializeSlackClientStore,
  performCacheCleanup
} from '../getSlackClient';
import { SlackInstallationStore } from '@/services/slackInstallationStore';
import { WebClient } from '@slack/web-api';

// Mock WebClient
jest.mock('@slack/web-api', () => ({
  WebClient: jest.fn().mockImplementation((token: string) => ({
    token,
    auth: {
      test: jest.fn().mockResolvedValue({ ok: true })
    }
  }))
}));

// Mock logger
jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('getSlackClient', () => {
  let mockStore: jest.Mocked<SlackInstallationStore>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Clear cache
    clearAllClientCache();
    
    // Create mock store
    mockStore = {
      fetchInstallation: jest.fn(),
      storeInstallation: jest.fn(),
      deleteInstallation: jest.fn()
    } as any;
    
    // Initialize store
    initializeSlackClientStore(mockStore);
    
    // Clear environment token for clean tests
    delete process.env.SLACK_BOT_TOKEN;
  });

  describe('OAuth token resolution', () => {
    it('should create WebClient from OAuth installation', async () => {
      const mockInstallation = {
        team: { id: 'T123' },
        bot: {
          id: 'B123',
          userId: 'U123',
          token: 'xoxb-oauth-token'
        }
      };
      
      mockStore.fetchInstallation.mockResolvedValueOnce(mockInstallation);
      
      const client = await getSlackClient('T123');
      
      expect(mockStore.fetchInstallation).toHaveBeenCalledWith({
        teamId: 'T123',
        enterpriseId: undefined,
        isEnterpriseInstall: false
      });
      
      expect(WebClient).toHaveBeenCalledWith('xoxb-oauth-token');
      expect(client).toBeDefined();
    });

    it('should handle enterprise installations', async () => {
      const mockInstallation = {
        team: { id: 'T123' },
        enterprise: { id: 'E123' },
        bot: {
          id: 'B123',
          userId: 'U123',
          token: 'xoxb-enterprise-token'
        }
      };
      
      mockStore.fetchInstallation.mockResolvedValueOnce(mockInstallation);
      
      const client = await getSlackClient('T123', 'E123');
      
      expect(mockStore.fetchInstallation).toHaveBeenCalledWith({
        teamId: 'T123',
        enterpriseId: 'E123',
        isEnterpriseInstall: true
      });
      
      expect(WebClient).toHaveBeenCalledWith('xoxb-enterprise-token');
    });
  });

  describe('Environment token fallback', () => {
    it('should fall back to environment token when OAuth fails', async () => {
      process.env.SLACK_BOT_TOKEN = 'xoxb-env-token';
      
      mockStore.fetchInstallation.mockResolvedValueOnce(undefined);
      
      const client = await getSlackClient('T123');
      
      expect(WebClient).toHaveBeenCalledWith('xoxb-env-token');
      expect(client).toBeDefined();
    });

    it('should throw error when no token available', async () => {
      mockStore.fetchInstallation.mockResolvedValueOnce(undefined);
      
      await expect(getSlackClient('T123')).rejects.toThrow(
        'No Slack token available for team T123'
      );
    });
  });

  describe('Cache behavior', () => {
    it('should cache WebClient instances', async () => {
      const mockInstallation = {
        team: { id: 'T123' },
        bot: {
          id: 'B123',
          userId: 'U123',
          token: 'xoxb-cached-token'
        }
      };
      
      mockStore.fetchInstallation.mockResolvedValue(mockInstallation);
      
      // First call - cache miss
      const client1 = await getSlackClient('T123');
      expect(mockStore.fetchInstallation).toHaveBeenCalledTimes(1);
      
      // Second call - cache hit
      const client2 = await getSlackClient('T123');
      expect(mockStore.fetchInstallation).toHaveBeenCalledTimes(1);
      
      // Should return same instance
      expect(client1).toBe(client2);
      
      // Check cache stats
      const stats = getCacheStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(50);
    });

    it('should clear specific team cache', async () => {
      const mockInstallation = {
        team: { id: 'T123' },
        bot: {
          id: 'B123',
          userId: 'U123',
          token: 'xoxb-token'
        }
      };
      
      mockStore.fetchInstallation.mockResolvedValue(mockInstallation);
      
      // Cache the client
      await getSlackClient('T123');
      expect(getCacheStats().size).toBe(1);
      
      // Clear specific cache
      clearClientCache('T123');
      expect(getCacheStats().size).toBe(0);
      
      // Next call should be cache miss
      await getSlackClient('T123');
      expect(mockStore.fetchInstallation).toHaveBeenCalledTimes(2);
    });
  });

  describe('Invalid auth handling', () => {
    it('should clear cache and delete installation on invalid_auth', async () => {
      const mockInstallation = {
        team: { id: 'T123' },
        bot: {
          id: 'B123',
          userId: 'U123',
          token: 'xoxb-invalid-token'
        }
      };
      
      mockStore.fetchInstallation.mockResolvedValue(mockInstallation);
      
      // Cache a client
      await getSlackClient('T123');
      expect(getCacheStats().size).toBe(1);
      
      // Handle invalid auth
      await handleInvalidAuth('T123');
      
      // Cache should be cleared
      expect(getCacheStats().size).toBe(0);
      
      // Installation should be deleted
      expect(mockStore.deleteInstallation).toHaveBeenCalledWith({
        teamId: 'T123',
        enterpriseId: undefined,
        isEnterpriseInstall: false
      });
    });
  });

  describe('Cache cleanup', () => {
    it('should perform cache cleanup', () => {
      // This mainly tests that cleanup runs without error
      performCacheCleanup();
      
      const stats = getCacheStats();
      expect(stats).toBeDefined();
      expect(stats.size).toBe(0);
    });
  });

  describe('Memory usage', () => {
    it('should estimate memory usage correctly', async () => {
      const mockInstallation = {
        team: { id: 'T123' },
        bot: {
          id: 'B123',
          userId: 'U123',
          token: 'xoxb-token'
        }
      };
      
      mockStore.fetchInstallation.mockResolvedValue(mockInstallation);
      
      // Add multiple clients
      for (let i = 0; i < 10; i++) {
        mockInstallation.team.id = `T${i}`;
        await getSlackClient(`T${i}`);
      }
      
      const stats = getCacheStats();
      expect(stats.size).toBe(10);
      expect(stats.memoryUsage).toBeGreaterThan(0);
      expect(stats.memoryUsage).toBeLessThan(100 * 1024 * 1024); // Less than 100MB
    });
  });
});