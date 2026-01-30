import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelativeTime(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  if (hours < 24) return `${hours} giờ trước`;
  if (days < 7) return `${days} ngày trước`;
  
  return formatDate(d);
}

export function getRelationshipLabel(stage: string): string {
  const labels: Record<string, string> = {
    STRANGER: 'Người lạ',
    ACQUAINTANCE: 'Quen biết',
    FRIEND: 'Bạn bè',
    CLOSE_FRIEND: 'Bạn thân',
    CRUSH: 'Crush',
    DATING: 'Đang hẹn hò',
    LOVER: 'Người yêu',
  };
  return labels[stage] || stage;
}

export function getMoodEmoji(mood: string): string {
  const emojis: Record<string, string> = {
    happy: '😊',
    sad: '😢',
    excited: '🤩',
    sleepy: '😴',
    romantic: '😍',
    neutral: '😐',
    angry: '😤',
  };
  return emojis[mood] || '😊';
}

export function getPersonalityLabel(personality: string): string {
  const labels: Record<string, string> = {
    caring: 'Quan tâm',
    playful: 'Vui vẻ',
    shy: 'Nhút nhát',
    passionate: 'Nồng nhiệt',
    intellectual: 'Sâu sắc',
  };
  return labels[personality] || personality;
}
