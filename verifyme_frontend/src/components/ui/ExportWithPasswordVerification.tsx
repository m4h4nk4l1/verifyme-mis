'use client'

import React, { useState } from 'react'
import { PasswordVerificationModal } from './PasswordVerificationModal'

interface ExportWithPasswordVerificationProps {
  children: React.ReactNode
  onExport: (password: string) => Promise<void>
  exportType: 'excel' | 'pdf' | 'csv'
  className?: string
}

export function ExportWithPasswordVerification({
  children,
  onExport,
  exportType,
  className
}: ExportWithPasswordVerificationProps) {
  const [showPasswordModal, setShowPasswordModal] = useState(false)

  const handleExportClick = () => {
    setShowPasswordModal(true)
  }

  const handlePasswordVerified = async (password: string) => {
    try {
      console.log('🔐 Password verified, starting export...')
      await onExport(password)
      console.log('✅ Export completed successfully')
    } catch (error) {
      console.error('❌ Export failed:', error)
      // Error handling is done in the onExport function
    }
  }

  const handleClose = () => {
    setShowPasswordModal(false)
  }

  return (
    <>
      <div onClick={handleExportClick} className={className}>
        {children}
      </div>
      
      <PasswordVerificationModal
        isOpen={showPasswordModal}
        onClose={handleClose}
        onVerified={handlePasswordVerified}
        title="Password Verification Required"
        description={`Please enter your password to export data as ${exportType.toUpperCase()}.`}
        operation={`export data as ${exportType.toUpperCase()}`}
      />
    </>
  )
}