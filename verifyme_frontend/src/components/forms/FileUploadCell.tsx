'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { 
  Upload, 
  FileText, 
  X,
  CheckCircle
} from 'lucide-react'

interface FileUploadCellProps {
  value?: string
  entryId: string
  fieldName: string
  onUploadComplete: (file: File) => void
}

export function FileUploadCell({ 
  value, 
  entryId, 
  fieldName, 
  onUploadComplete 
}: FileUploadCellProps) {
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setUploading(true)
    try {
      onUploadComplete(selectedFile)
      setSelectedFile(null)
    } catch (error) {
      console.error('Upload failed:', error)
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = () => {
    setSelectedFile(null)
  }

  if (value) {
    return (
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-blue-500" />
        <span className="text-sm text-gray-600">File uploaded</span>
        <CheckCircle className="h-4 w-4 text-green-500" />
      </div>
    )
  }

  if (selectedFile) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs truncate max-w-20">{selectedFile.name}</span>
        <Button
          size="sm"
          variant="outline"
          onClick={handleUpload}
          disabled={uploading}
          className="h-6 px-2"
        >
          {uploading ? 'Uploading...' : 'Upload'}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleRemove}
          className="h-6 px-1"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="file"
        onChange={handleFileSelect}
        className="hidden"
        id={`file-${entryId}-${fieldName}`}
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
      />
      <label htmlFor={`file-${entryId}-${fieldName}`}>
        <Button
          size="sm"
          variant="outline"
          className="h-6 px-2 cursor-pointer"
        >
          <Upload className="h-3 w-3 mr-1" />
          Upload
        </Button>
      </label>
    </div>
  )
} 