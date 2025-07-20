'use client'

import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  AlertTriangle, 
  CheckCircle, 
  Merge,
  Trash2,
  Eye
} from 'lucide-react'
import { FormEntry } from '@/types/api'

interface DuplicateDetectionProps {
  entries: FormEntry[]
  onDuplicateSelect?: (duplicates: FormEntry[]) => void
  onResolveDuplicate?: (entryId: string, action: 'keep' | 'merge' | 'delete') => void
}

interface DuplicateGroup {
  key: string
  entries: FormEntry[]
  confidence: number
}

export function DuplicateDetection({ 
  entries, 
  onResolveDuplicate 
}: DuplicateDetectionProps) {
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const [resolvedDuplicates, setResolvedDuplicates] = useState<Set<string>>(new Set())

  // Detect duplicates based on critical fields
  const duplicateGroups = useMemo(() => {
    const groups = new Map<string, FormEntry[]>()
    
    entries.forEach(entry => {
      // Create duplicate key based on critical fields
      const key = createDuplicateKey(entry)
      if (key) {
        if (!groups.has(key)) {
          groups.set(key, [])
        }
        groups.get(key)!.push(entry)
      }
    })

    // Filter groups with more than one entry
    const duplicateGroups: DuplicateGroup[] = []
    groups.forEach((groupEntries, key) => {
      if (groupEntries.length > 1) {
        duplicateGroups.push({
          key,
          entries: groupEntries,
          confidence: calculateConfidence(groupEntries)
        })
      }
    })

    return duplicateGroups.sort((a, b) => b.confidence - a.confidence)
  }, [entries])

  const createDuplicateKey = (entry: FormEntry) => {
    const criticalFields = ['applicant_name', 'pan_card', 'aadhar_number', 'phone_number']
    const values = criticalFields.map(field => entry.form_data[field]).filter(Boolean)
    return values.length > 0 ? values.join('|') : null
  }

  const calculateConfidence = (groupEntries: FormEntry[]) => {
    // Calculate confidence based on field similarity
    let totalConfidence = 0
    const criticalFields = ['applicant_name', 'pan_card', 'aadhar_number', 'phone_number']
    
    criticalFields.forEach(field => {
      const values = groupEntries.map(entry => entry.form_data[field]).filter(Boolean)
      if (values.length > 1) {
        const uniqueValues = new Set(values)
        totalConfidence += (values.length - uniqueValues.size) / values.length
      }
    })
    
    return Math.round((totalConfidence / criticalFields.length) * 100)
  }

  const handleResolve = (entryId: string, action: 'keep' | 'merge' | 'delete') => {
    setResolvedDuplicates(prev => new Set([...prev, entryId]))
    onResolveDuplicate?.(entryId, action)
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-red-600 bg-red-50'
    if (confidence >= 60) return 'text-orange-600 bg-orange-50'
    return 'text-yellow-600 bg-yellow-50'
  }

  if (duplicateGroups.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No duplicates found</h3>
          <p className="text-gray-600 text-center">
            All entries appear to be unique based on the current criteria.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">
            Duplicate Detection Results
          </h3>
          <p className="text-gray-600">
            Found {duplicateGroups.length} potential duplicate groups
          </p>
        </div>
        <Badge variant="destructive" className="text-sm">
          {duplicateGroups.reduce((total, group) => total + group.entries.length, 0)} total entries
        </Badge>
      </div>

      {/* Duplicate Groups */}
      <div className="space-y-4">
        {duplicateGroups.map((group) => (
          <Card key={group.key} className="border-orange-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  <CardTitle className="text-base">
                    Duplicate Group ({group.entries.length} entries)
                  </CardTitle>
                  <Badge className={getConfidenceColor(group.confidence)}>
                    {group.confidence}% match
                  </Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedGroup(selectedGroup === group.key ? null : group.key)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  {selectedGroup === group.key ? 'Hide' : 'View'} Details
                </Button>
              </div>
            </CardHeader>
            
            {selectedGroup === group.key && (
              <CardContent>
                <div className="space-y-4">
                  {group.entries.map((entry) => (
                    <div
                      key={entry.id}
                      className={`p-4 border rounded-lg ${
                        resolvedDuplicates.has(entry.id) 
                          ? 'bg-gray-50 border-gray-200' 
                          : 'bg-white border-orange-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {entry.form_data.applicant_name || 'Unknown'}
                          </span>
                          <Badge variant={entry.is_completed ? "default" : "secondary"}>
                            {entry.is_completed ? 'Completed' : 'Pending'}
                          </Badge>
                        </div>
                        {!resolvedDuplicates.has(entry.id) && (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleResolve(entry.id, 'keep')}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Keep
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleResolve(entry.id, 'merge')}
                            >
                              <Merge className="h-4 w-4 mr-1" />
                              Merge
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleResolve(entry.id, 'delete')}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        )}
                        {resolvedDuplicates.has(entry.id) && (
                          <Badge variant="outline" className="text-green-600">
                            Resolved
                          </Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">PAN:</span>
                          <span className="ml-2 font-mono">
                            {entry.form_data.pan_card || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Aadhar:</span>
                          <span className="ml-2 font-mono">
                            {entry.form_data.aadhar_number || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Phone:</span>
                          <span className="ml-2">
                            {entry.form_data.phone_number || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Created:</span>
                          <span className="ml-2">
                            {new Date(entry.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
} 