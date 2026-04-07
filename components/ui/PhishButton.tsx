'use client'
import { motion } from 'framer-motion'
import { CSSProperties, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'warning'

interface PhishButtonProps {
  variant?: ButtonVariant
  children: ReactNode
  onClick?: any
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  className?: string
  [key: string]: any
}

const styles: Record<ButtonVariant, CSSProperties> = {
  primary: {
    background: 'linear-gradient(135deg, #2DD4BF, #22c55e)',
    color: '#000000',
    fontWeight: 700,
    border: 'none',
  },
  secondary: {
    background: 'rgba(255,255,255,0.08)',
    color: '#E6EDF3',
    border: '1px solid rgba(255,255,255,0.15)',
  },
  danger: {
    background: 'rgba(248,81,73,0.12)',
    color: '#F85149',
    border: '1px solid rgba(248,81,73,0.3)',
  },
  success: {
    background: 'rgba(63,185,80,0.12)',
    color: '#3FB950',
    border: '1px solid rgba(63,185,80,0.3)',
  },
  warning: {
    background: 'rgba(227,179,65,0.12)',
    color: '#E3B341',
    border: '1px solid rgba(227,179,65,0.3)',
  },
}

const hoverStyles: Record<ButtonVariant, any> = {
  primary: { scale: 1.05, boxShadow: '0 0 28px rgba(45,212,191,0.5)' },
  secondary: { scale: 1.03, background: 'rgba(255,255,255,0.15)' },
  danger: { scale: 1.03, background: 'rgba(248,81,73,0.22)' },
  success: { scale: 1.03, background: 'rgba(63,185,80,0.22)' },
  warning: { scale: 1.03, background: 'rgba(227,179,65,0.22)' },
}

export default function PhishButton({
  variant = 'secondary',
  children,
  onClick,
  disabled,
  type = 'button',
  className,
  ...rest
}: PhishButtonProps) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? undefined : hoverStyles[variant]}
      whileTap={disabled ? undefined : { scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      style={{
        ...styles[variant],
        borderRadius: 9999,
        padding: '10px 22px',
        fontSize: 14,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        whiteSpace: 'nowrap',
      }}
      className={className}
      {...rest}
    >
      {children}
    </motion.button>
  )
}
