// Shared animation state — written by scrollManager, read by main render loop
export const state = {
  currentSection: 0,
  isDriving: false,
  drivingProgress: 0,   // 0 = fully parked, 1 = full speed
  drivingDirection: 1,  // +1 = scrolling down, -1 = scrolling up
  totalSections: 4,
};
