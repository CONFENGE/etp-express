import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { Footer } from './Footer';

const renderFooter = () => {
  return render(
    <BrowserRouter>
      <Footer />
    </BrowserRouter>,
  );
};

describe('Footer', () => {
  it('should render copyright text', () => {
    renderFooter();
    expect(
      screen.getByText(/ETP Express. Todos os direitos reservados/),
    ).toBeInTheDocument();
  });

  it('should render support email link', () => {
    renderFooter();
    const supportLink = screen.getByRole('link', {
      name: /enviar email para suporte/i,
    });
    expect(supportLink).toBeInTheDocument();
    expect(supportLink).toHaveAttribute(
      'href',
      'mailto:suporte@confenge.com.br?subject=Suporte%20ETP%20Express',
    );
  });

  it('should render privacy policy link', () => {
    renderFooter();
    const privacyLink = screen.getByRole('link', {
      name: /política de privacidade/i,
    });
    expect(privacyLink).toBeInTheDocument();
    expect(privacyLink).toHaveAttribute('href', '/privacy');
  });

  it('should render terms of use link', () => {
    renderFooter();
    const termsLink = screen.getByRole('link', { name: /termos de uso/i });
    expect(termsLink).toBeInTheDocument();
    expect(termsLink).toHaveAttribute('href', '/terms');
  });

  it('should render LGPD compliance text', () => {
    renderFooter();
    expect(screen.getByText(/Conforme LGPD/)).toBeInTheDocument();
  });
});
