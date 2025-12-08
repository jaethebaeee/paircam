import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LandingPage from '../LandingPage';

// Mock AuthContext
vi.mock('../../contexts/AuthContext', () => ({
  useAuthContext: () => ({
    isPremium: false,
  }),
}));

// Mock AnimatedBackground
vi.mock('../ui/AnimatedBackground', () => ({
  default: () => <div data-testid="animated-background" />,
}));

// Mock AdBanner
vi.mock('../ads/AdBanner', () => ({
  default: () => <div data-testid="ad-banner" />,
}));

// Mock PremiumModal
vi.mock('../PremiumModal', () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="premium-modal">
      <button onClick={onClose}>Close Premium Modal</button>
    </div>
  ),
}));

describe('LandingPage', () => {
  const mockOnStartCall = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the landing page with hero section', () => {
      render(<LandingPage onStartCall={mockOnStartCall} />);

      expect(screen.getByText(/Video Chat with Strangers/i)).toBeInTheDocument();
    });

    it('should render the animated background', () => {
      render(<LandingPage onStartCall={mockOnStartCall} />);

      expect(screen.getByTestId('animated-background')).toBeInTheDocument();
    });

    it('should display live user count', async () => {
      render(<LandingPage onStartCall={mockOnStartCall} />);

      await waitFor(() => {
        expect(screen.getAllByText(/online/i).length).toBeGreaterThan(0);
      });
    });

    it('should render value props', () => {
      render(<LandingPage onStartCall={mockOnStartCall} />);

      expect(screen.getByText('Free')).toBeInTheDocument();
      expect(screen.getByText('Anonymous')).toBeInTheDocument();
      expect(screen.getByText('Instant')).toBeInTheDocument();
    });

    it('should render start chat form', () => {
      render(<LandingPage onStartCall={mockOnStartCall} />);

      expect(screen.getByPlaceholderText(/Enter a nickname/i)).toBeInTheDocument();
    });
  });

  describe('form validation', () => {
    it('should show error when trying to start without name', async () => {
      const user = userEvent.setup();
      render(<LandingPage onStartCall={mockOnStartCall} />);

      const startButton = screen.getByRole('button', { name: /Start Chat/i });
      await user.click(startButton);

      expect(screen.getByText(/Please enter a name/i)).toBeInTheDocument();
      expect(mockOnStartCall).not.toHaveBeenCalled();
    });

    it('should show error when 18+ is checked but age is under 18', async () => {
      const user = userEvent.setup();
      render(<LandingPage onStartCall={mockOnStartCall} />);

      // Enter name
      const nameInput = screen.getByPlaceholderText(/Enter a nickname/i);
      await user.type(nameInput, 'TestUser');

      // Check 18+ checkbox
      const adultCheckbox = screen.getByLabelText(/I'm 18 or older/i);
      await user.click(adultCheckbox);

      // Enter age under 18
      const ageInput = screen.getByPlaceholderText('18');
      await user.type(ageInput, '17');

      // Try to start
      const startButton = screen.getByRole('button', { name: /Start Chat/i });
      await user.click(startButton);

      expect(screen.getByText(/Must be 18 or older/i)).toBeInTheDocument();
      expect(mockOnStartCall).not.toHaveBeenCalled();
    });

    it('should allow starting when name is provided without 18+ check', async () => {
      const user = userEvent.setup();
      render(<LandingPage onStartCall={mockOnStartCall} />);

      // Enter name
      const nameInput = screen.getByPlaceholderText(/Enter a nickname/i);
      await user.type(nameInput, 'TestUser');

      // Start chat
      const startButton = screen.getByRole('button', { name: /Start Chat/i });
      await user.click(startButton);

      expect(mockOnStartCall).toHaveBeenCalledWith({
        name: 'TestUser',
        isTextMode: false,
        isVideoEnabled: true,
      });
    });

    it('should allow starting when 18+ is checked with valid age', async () => {
      const user = userEvent.setup();
      render(<LandingPage onStartCall={mockOnStartCall} />);

      // Enter name
      const nameInput = screen.getByPlaceholderText(/Enter a nickname/i);
      await user.type(nameInput, 'TestUser');

      // Check 18+ checkbox
      const adultCheckbox = screen.getByLabelText(/I'm 18 or older/i);
      await user.click(adultCheckbox);

      // Enter valid age
      const ageInput = screen.getByPlaceholderText('18');
      await user.type(ageInput, '25');

      // Start chat
      const startButton = screen.getByRole('button', { name: /Start Chat/i });
      await user.click(startButton);

      expect(mockOnStartCall).toHaveBeenCalledWith({
        name: 'TestUser',
        isTextMode: false,
        isVideoEnabled: true,
      });
    });
  });

  describe('video toggle', () => {
    it('should toggle video enabled state', async () => {
      const user = userEvent.setup();
      render(<LandingPage onStartCall={mockOnStartCall} />);

      // Enter name
      const nameInput = screen.getByPlaceholderText(/Enter a nickname/i);
      await user.type(nameInput, 'TestUser');

      const startButton = screen.getByRole('button', { name: /Start Chat/i });
      await user.click(startButton);

      // Default behavior with video enabled
      expect(mockOnStartCall).toHaveBeenCalledWith({
        name: 'TestUser',
        isTextMode: false,
        isVideoEnabled: true,
      });
    });
  });

  describe('text mode', () => {
    it('should start in text mode when text only button is clicked', async () => {
      const user = userEvent.setup();
      render(<LandingPage onStartCall={mockOnStartCall} />);

      // Enter name
      const nameInput = screen.getByPlaceholderText(/Enter a nickname/i);
      await user.type(nameInput, 'TestUser');

      // Click text only mode
      const textModeButton = screen.getByText(/or text only/i);
      await user.click(textModeButton);

      expect(mockOnStartCall).toHaveBeenCalledWith({
        name: 'TestUser',
        isTextMode: true,
        isVideoEnabled: true,
      });
    });
  });

  describe('premium modal', () => {
    it('should open premium modal when premium button is clicked', async () => {
      const user = userEvent.setup();
      render(<LandingPage onStartCall={mockOnStartCall} />);

      // Click premium button
      const premiumButton = screen.getByRole('button', { name: /premium/i });
      await user.click(premiumButton);

      expect(screen.getByTestId('premium-modal')).toBeInTheDocument();
    });

    it('should close premium modal when close is clicked', async () => {
      const user = userEvent.setup();
      render(<LandingPage onStartCall={mockOnStartCall} />);

      // Open modal
      const premiumButton = screen.getByRole('button', { name: /premium/i });
      await user.click(premiumButton);

      // Close modal
      const closeButton = screen.getByText('Close Premium Modal');
      await user.click(closeButton);

      expect(screen.queryByTestId('premium-modal')).not.toBeInTheDocument();
    });
  });

  describe('input interactions', () => {
    it('should clear name error when user starts typing', async () => {
      const user = userEvent.setup();
      render(<LandingPage onStartCall={mockOnStartCall} />);

      // Trigger error first
      const startButton = screen.getByRole('button', { name: /Start Chat/i });
      await user.click(startButton);
      expect(screen.getByText(/Please enter a name/i)).toBeInTheDocument();

      // Start typing
      const nameInput = screen.getByPlaceholderText(/Enter a nickname/i);
      await user.type(nameInput, 'T');

      // Error should be cleared
      expect(screen.queryByText(/Please enter a name/i)).not.toBeInTheDocument();
    });

    it('should limit name to 30 characters', async () => {
      const user = userEvent.setup();
      render(<LandingPage onStartCall={mockOnStartCall} />);

      const nameInput = screen.getByPlaceholderText(/Enter a nickname/i) as HTMLInputElement;
      const longName = 'A'.repeat(35);
      await user.type(nameInput, longName);

      expect(nameInput.value.length).toBeLessThanOrEqual(30);
    });
  });

  describe('adult confirmation toggle', () => {
    it('should show age input when 18+ is checked', async () => {
      const user = userEvent.setup();
      render(<LandingPage onStartCall={mockOnStartCall} />);

      // Initially no age input
      expect(screen.queryByPlaceholderText('18')).not.toBeInTheDocument();

      // Check 18+ checkbox
      const adultCheckbox = screen.getByLabelText(/I'm 18 or older/i);
      await user.click(adultCheckbox);

      // Age input should appear
      expect(screen.getByPlaceholderText('18')).toBeInTheDocument();
    });

    it('should hide age input and clear age when 18+ is unchecked', async () => {
      const user = userEvent.setup();
      render(<LandingPage onStartCall={mockOnStartCall} />);

      // Check 18+ checkbox
      const adultCheckbox = screen.getByLabelText(/I'm 18 or older/i);
      await user.click(adultCheckbox);

      // Enter age
      const ageInput = screen.getByPlaceholderText('18');
      await user.type(ageInput, '25');

      // Uncheck 18+ checkbox
      await user.click(adultCheckbox);

      // Age input should be hidden
      expect(screen.queryByPlaceholderText('18')).not.toBeInTheDocument();
    });
  });

  describe('navigation links', () => {
    it('should render terms and privacy links', () => {
      render(<LandingPage onStartCall={mockOnStartCall} />);

      expect(screen.getByRole('link', { name: /Terms/i })).toHaveAttribute(
        'href',
        '/terms-of-service'
      );
      expect(screen.getByRole('link', { name: /Privacy/i })).toHaveAttribute(
        'href',
        '/privacy-policy'
      );
    });
  });

  describe('live user count', () => {
    it('should update live user count over time', async () => {
      vi.useFakeTimers();
      render(<LandingPage onStartCall={mockOnStartCall} />);

      const onlineElements = screen.getAllByText(/online/i);
      expect(onlineElements.length).toBeGreaterThan(0);

      vi.advanceTimersByTime(5000);

      expect(screen.getAllByText(/online/i).length).toBeGreaterThan(0);

      vi.useRealTimers();
    });
  });
});
