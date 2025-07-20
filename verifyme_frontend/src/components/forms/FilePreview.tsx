'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Download, 
  X, 
  FileText, 
  Image, 
  File, 
  ZoomIn,
  ZoomOut
} from 'lucide-react'

interface FilePreviewProps {
  file: {
    id: string
    original_filename: string
    file_type: string
    file_size: number
    file: string // URL to the file
    description?: string
  }
  onClose: () => void
  onDownload?: (fileId: string) => void
}

export function FilePreview({ file, onClose, onDownload }: FilePreviewProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)

  const generatePreview = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      if (file.file_type.startsWith('image/')) {
        // Image files - direct preview
        setPreviewUrl(file.file)
      } else if (file.file_type === 'application/pdf') {
        // PDF files - use PDF.js or embed
        setPreviewUrl(file.file)
      } else if (file.file_type.includes('word') || file.file_type.includes('document')) {
        // DOCX files - convert to preview or show download
        setPreviewUrl(null)
        setError('Preview not available for this file type. Please download to view.')
      } else {
        // Other files - show download option
        setPreviewUrl(null)
        setError('Preview not available for this file type.')
      }
    } catch (err) {
      console.error('Error generating preview:', err)
      setError('Failed to generate preview')
    } finally {
      setLoading(false)
    }
  }, [file])

  useEffect(() => {
    generatePreview()
  }, [generatePreview])

  const handleDownload = () => {
    if (onDownload) {
      onDownload(file.id)
    } else {
      // Fallback download
      const link = document.createElement('a')
      link.href = file.file
      link.download = file.original_filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = () => {
    if (file.file_type.startsWith('image/')) {
      return <Image className="h-8 w-8 text-blue-600" />
    } else if (file.file_type === 'application/pdf') {
      return <FileText className="h-8 w-8 text-red-600" />
    } else {
      return <File className="h-8 w-8 text-gray-600" />
    }
  }

  const renderPreview = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          <span className="ml-2">Loading preview...</span>
        </div>
      )
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <File className="h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={handleDownload} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Download File
          </Button>
        </div>
      )
    }

    if (file.file_type.startsWith('image/')) {
      return (
        <div className="relative">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
                variant="outline"
                size="sm"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm text-gray-600">{Math.round(zoom * 100)}%</span>
              <Button
                onClick={() => setZoom(Math.min(3, zoom + 0.25))}
                variant="outline"
                size="sm"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="overflow-auto max-h-96">
            <img
              src={previewUrl!}
              alt={`Preview of ${file.original_filename}`}
              className="max-w-full h-auto"
              style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
            />
          </div>
        </div>
      )
    }

    if (file.file_type === 'application/pdf') {
      return (
        <div className="h-96">
          <iframe
            src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=0`}
            className="w-full h-full border rounded"
            title={file.original_filename}
          />
        </div>
      )
    }

    return null
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center space-x-3">
            {getFileIcon()}
            <div>
              <CardTitle className="text-lg">{file.original_filename}</CardTitle>
              <p className="text-sm text-gray-600">
                {formatFileSize(file.file_size)} • {file.file_type}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button onClick={handleDownload} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button onClick={onClose} variant="outline" size="sm">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-auto max-h-[calc(90vh-120px)]">
          {file.description && (
            <div className="mb-4 p-3 bg-gray-50 rounded">
              <p className="text-sm text-gray-700">{file.description}</p>
            </div>
          )}
          {renderPreview()}
        </CardContent>
      </Card>
    </div>
  )
} 