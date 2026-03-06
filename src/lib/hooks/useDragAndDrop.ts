'use client';

import { useState } from 'react';

export type DragItem = {
  id: string;
  data: any;
};

export function useDragAndDrop() {
  const [draggedItem, setDraggedItem] = useState<DragItem | null>(null);

  const handleDragStart = (item: DragItem) => (e: React.DragEvent) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget.innerHTML);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (onDrop: (item: DragItem) => void) => (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedItem) {
      onDrop(draggedItem);
    }
  };

  return {
    draggedItem,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDrop,
  };
}
