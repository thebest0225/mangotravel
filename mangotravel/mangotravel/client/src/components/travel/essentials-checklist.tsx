import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CheckCircle, ChevronDown, ChevronUp, Paperclip, Camera, Upload, Eye } from "lucide-react";
import type { EssentialItem } from "@shared/schema";

interface EssentialsChecklistProps {
  items: EssentialItem[];
  onToggleItem: (id: string, checked: boolean) => void;
  onEditChecklist?: () => void;
  onUpdateItem?: (id: string, updates: Partial<EssentialItem>) => void;
}

function ImageUploadDialog({ item, onUpdateItem }: { 
  item: EssentialItem; 
  onUpdateItem: (id: string, updates: Partial<EssentialItem>) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const optimizeImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // 최대 크기 설정 (800x600)
        const maxWidth = 800;
        const maxHeight = 600;
        let { width, height } = img;
        
        // 비율 유지하면서 크기 조정
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // 이미지 그리기 및 압축
        ctx?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8); // 80% 품질로 압축
        resolve(dataUrl);
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files) return;
    
    const newImages = await Promise.all(
      Array.from(files).map(async (file) => {
        return await optimizeImage(file);
      })
    );
    
    const updatedImages = [...(item.attachedImages || []), ...newImages];
    onUpdateItem(item.id, { attachedImages: updatedImages });
    setIsOpen(false);
  };

  const removeImage = (imageUrl: string) => {
    const updatedImages = (item.attachedImages || []).filter(img => img !== imageUrl);
    onUpdateItem(item.id, { attachedImages: updatedImages });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="ml-2 h-6 px-2 text-xs text-blue-600 hover:text-blue-800"
        >
          <Paperclip className="w-3 h-3 mr-1" />
          첨부 ({(item.attachedImages || []).length})
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]" aria-describedby="upload-dialog-description">
        <DialogHeader>
          <DialogTitle>{item.name} - 첨부 파일</DialogTitle>
        </DialogHeader>
        <div id="upload-dialog-description" className="sr-only">
          이 다이얼로그에서 {item.name} 항목에 이미지를 첨부하거나 기존 첨부된 이미지를 관리할 수 있습니다.
        </div>
        
        <div className="space-y-4">
          {/* Upload buttons */}
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1"
            >
              <Upload className="w-4 h-4 mr-2" />
              파일 업로드
            </Button>
            <Button
              variant="outline"
              onClick={() => cameraInputRef.current?.click()}
              className="flex-1"
            >
              <Camera className="w-4 h-4 mr-2" />
              사진 촬영
            </Button>
          </div>

          {/* Hidden file inputs */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFileUpload(e.target.files)}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handleFileUpload(e.target.files)}
          />

          {/* Attached images */}
          {(item.attachedImages || []).length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">첨부된 이미지</h4>
              <div className="grid grid-cols-2 gap-2">
                {(item.attachedImages || []).map((imageUrl, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={imageUrl}
                      alt={`첨부 이미지 ${index + 1}`}
                      className="w-full h-24 object-cover rounded border"
                      onError={(e) => {
                        console.log('Image load error:', imageUrl);
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                      onClick={() => removeImage(imageUrl)}
                    >
                      ×
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function EssentialsChecklist({ 
  items, 
  onToggleItem, 
  onEditChecklist,
  onUpdateItem 
}: EssentialsChecklistProps) {
  const [isOpen, setIsOpen] = useState(false);
  const checkedCount = items.filter(item => item.checked).length;
  const totalCount = items.length;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-gray-50 py-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center text-sm">
                <CheckCircle className="mr-2 text-green-500 w-4 h-4" />
                필수 준비물
              </CardTitle>
              <div className="flex items-center space-x-2">
                {onEditChecklist && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditChecklist();
                    }}
                    className="text-primary-500"
                  >
                    편집
                  </Button>
                )}
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </div>
            <div className="text-xs text-gray-600">
              {totalCount > 0 ? `${checkedCount}/${totalCount} 완료` : "준비물이 없습니다"}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="py-2">
            {items.length === 0 ? (
              <p className="text-gray-500 text-center py-2">
                준비물이 없습니다.
              </p>
            ) : (
              <div className="space-y-2">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center space-x-3 p-1">
                    <Checkbox
                      checked={item.checked}
                      onCheckedChange={(checked) => 
                        onToggleItem(item.id, checked as boolean)
                      }
                      className="w-4 h-4"
                    />
                    <span 
                      className={`text-gray-900 text-sm flex-1 ${
                        item.checked ? "line-through opacity-60" : ""
                      }`}
                    >
                      {item.name}
                    </span>
                    {onUpdateItem && (
                      <ImageUploadDialog 
                        item={item} 
                        onUpdateItem={onUpdateItem}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
