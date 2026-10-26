import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Input.jsx';
import { Card, CardTitle, CardContent } from '../components/ui/Card.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Alert } from '../components/ui/Alert.jsx';
import { Modal } from '../components/ui/Modal.jsx';

describe('Design System UI Components', () => {
  it('Button renders text and responds to click', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Start Test</Button>);

    const btn = screen.getByRole('button', { name: /start test/i });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('Button renders loading state and is disabled', () => {
    render(<Button isLoading>Submit</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
  });

  it('Input renders label, input, and error message', () => {
    render(<Input label="Endpoint URL" error="Invalid URL scheme" />);
    expect(screen.getByText('Endpoint URL')).toBeInTheDocument();
    expect(screen.getByText('Invalid URL scheme')).toBeInTheDocument();
  });

  it('Card renders title and body content', () => {
    render(
      <Card>
        <CardTitle>Average Latency</CardTitle>
        <CardContent>42.5 ms</CardContent>
      </Card>
    );
    expect(screen.getByText('Average Latency')).toBeInTheDocument();
    expect(screen.getByText('42.5 ms')).toBeInTheDocument();
  });

  it('Badge renders status presets accurately', () => {
    render(<Badge status="running" dot />);
    expect(screen.getByText('Running')).toBeInTheDocument();
  });

  it('Alert renders alert text and allows dismissal', () => {
    const handleClose = vi.fn();
    render(
      <Alert title="Attention" variant="warning" onClose={handleClose}>
        Virtual user limit approached
      </Alert>
    );
    expect(screen.getByText('Attention')).toBeInTheDocument();
    expect(screen.getByText(/Virtual user limit/i)).toBeInTheDocument();

    const closeBtn = screen.getByLabelText(/Dismiss alert/i);
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('Modal renders only when isOpen is true and calls onClose when clicking close button', () => {
    const handleClose = vi.fn();
    const { rerender } = render(
      <Modal isOpen={false} onClose={handleClose} title="Configure Load Test">
        Modal Body
      </Modal>
    );
    expect(screen.queryByText('Configure Load Test')).not.toBeInTheDocument();

    rerender(
      <Modal isOpen={true} onClose={handleClose} title="Configure Load Test">
        Modal Body
      </Modal>
    );
    expect(screen.getByText('Configure Load Test')).toBeInTheDocument();
    expect(screen.getByText('Modal Body')).toBeInTheDocument();

    const closeBtn = screen.getByLabelText(/Close modal/i);
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
