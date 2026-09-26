export type ZoExpression3D =
  | 'neutral'
  | 'happy'
  | 'excited'
  | 'curious'
  | 'thinking'
  | 'confident'
  | 'wink'
  | 'surprised'
  | 'chill'
  | 'concerned'
  | 'helpful'
  | 'celebrating'
  // Legacy aliases
  | 'welcome'
  | 'success'
  | 'cleaning'
  | 'booking'
  | 'location'
  | 'faq'
  | 'offer'
  | 'loading'
  | 'empty_state'
  | 'warning'
  | 'error'
  | 'calm';

export type ZoPose3D =
  | 'idle'
  | 'waving'
  | 'pointing'
  | 'welcoming'
  | 'walking'
  | 'thinking'
  | 'thumbs_up'
  | 'celebrating'
  | 'looking_around'
  | 'leaning'
  | 'explaining'
  | 'holding_calendar'
  | 'holding_location'
  | 'holding_checkmark'
  // Extended props & gestures
  | 'holding_pin'
  | 'holding_cleaning_tool'
  | 'holding_coupon'
  | 'taking_photo'
  | 'sunglasses'
  | 'sitting'
  | 'side_look'
  | 'running';

export type ZoAnimationPreset =
  | 'none'
  | 'gentle_float'
  | 'bounce'
  | 'wave'
  | 'point'
  | 'thinking'
  | 'celebration'
  | 'shake';

export type ZoAnimationType =
  | 'none'
  | 'idle'
  | 'gentle_float'
  | 'bounce'
  | 'wave'
  | 'point'
  | 'thinking'
  | 'celebration'
  | 'celebrate'
  | 'shake'
  | 'breathe'
  | 'walk'
  | 'hover'
  | 'lean'
  | 'custom';

export type ZoDeviceBreakpoint = 'desktop' | 'tablet' | 'mobile';

export interface ZoDevicePosition {
  horizontal: 'left' | 'center' | 'right' | 'corner-right' | 'corner-left' | 'custom';
  vertical: 'top' | 'center' | 'bottom' | 'custom';
  offsetX: number; // in pixels
  offsetY: number; // in pixels
  size: number;    // width/height in pixels
  visible: boolean;
}

export interface ZoCharacterConfig {
  expression: ZoExpression3D;
  pose: ZoPose3D;
  animation: ZoAnimationType;
  animationPreset?: ZoAnimationPreset;
  animationSpeed: number; // 0.5 - 2.0
  animationIntensity?: number; // 0.5 - 2.0 (default 1.0)
  idleAnimation: boolean;
  autoBlink: boolean;
  eyeMovement: boolean;
  scale: number;          // 0.5 - 2.0
  rotationY: number;      // in degrees (-180 to 180)
  opacity: number;        // 0 to 1
  shadow: boolean;
  glow: boolean;
  customImage?: string;        // URL or public asset path
  customImageName?: string;    // Display filename
  customImageDepth?: number;   // Visual depth parameter
  renderMode?: '3d_procedural' | '3d_relief_image' | 'live_2d_character';
  originalImageUrl?: string;   // Direct uncompressed server upload URL
  originalFilename?: string;   // Original filename from user
  mimeType?: string;           // Image MIME type (image/png, image/jpeg, etc.)
  width?: number;              // Natural width in pixels
  height?: number;             // Natural height in pixels
  fileSize?: number;           // File size in bytes
  versionTimestamp?: number;   // Cache-busting timestamp
}

export interface ZoMessageConfig {
  enabled: boolean;
  title: string;
  titleEn: string;
  text: string;
  textEn: string;
  bubbleStyle: 'classic' | 'glass' | 'modern' | 'cleanzo_blue' | 'gradient';
  fontSize: 'sm' | 'md' | 'lg';
  maxWidth: number;       // in pixels (e.g. 280)
  position: 'top' | 'top-start' | 'top-end' | 'side-start' | 'side-end' | 'bottom';
  delay: number;          // milliseconds before appearing
  duration: number;       // milliseconds visible before auto-hide
  autoHide: boolean;
  showCloseButton: boolean;
  playSound: boolean;
  textColor?: string;
  titleColor?: string;
  backgroundColor?: string;
  borderColor?: string;
}

export type ZoTriggerEventType =
  | 'page_load'
  | 'page_enter'
  | 'button_click'
  | 'action'
  | 'service_selected'
  | 'service_changed'
  | 'booking_step_changed'
  | 'step_change'
  | 'date_selected'
  | 'time_selected'
  | 'address_completed'
  | 'form_submitted'
  | 'booking_completed'
  | 'success'
  | 'error'
  | 'hover'
  | 'scroll'
  | 'login_success'
  | 'registration_success';

export interface ZoTriggerRule {
  id: string;
  eventType: ZoTriggerEventType;
  conditionKey?: string;   // e.g. "car_wash", "step_2"
  priority: 1 | 2 | 3 | 4 | 5; // 1: Critical Error, 2: Success, 3: Action, 4: Page, 5: Idle
  expression: ZoExpression3D;
  pose: ZoPose3D;
  animation?: ZoAnimationType;
  message?: string;
  messageEn?: string;
  delay?: number;
  duration?: number;
  enabled: boolean;
}

export interface ZoSmartBehaviorConfig {
  frequency: 'every_visit' | 'once_per_session' | 'once_per_page' | 'only_on_trigger' | 'never_auto';
  respectDismissal: boolean;
  soundMuted: boolean;
}

export interface ZoPageConfig {
  pageId: string;
  pageNameAr: string;
  pageNameEn: string;
  pageCategory: 'main' | 'services' | 'booking' | 'account' | 'content' | 'system';
  pathPattern: string;    // e.g. "/services/car"
  enabled: boolean;

  // Responsive device settings
  desktop: ZoDevicePosition;
  tablet: ZoDevicePosition;
  mobile: ZoDevicePosition;

  // Character appearance
  character: ZoCharacterConfig;

  // Speech bubble
  message: ZoMessageConfig;

  // Event triggers
  triggers: ZoTriggerRule[];

  // Smart behavioral rules
  behavior: ZoSmartBehaviorConfig;

  // Metadata
  updatedAt?: string;
  publishedAt?: string;
}

export interface ZoStudioSnapshot {
  version: number;
  pageConfigs: Record<string, ZoPageConfig>;
}

export type ZoAdminPermission =
  | 'view_zo_studio'
  | 'edit_zo'
  | 'edit_messages'
  | 'edit_animations'
  | 'edit_page_config'
  | 'publish_zo_changes';
