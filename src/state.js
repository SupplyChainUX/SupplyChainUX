// Shared animation state — written by scrollManager, read by main render loop
export const state = {
  currentSection: 0,
  isDriving: false,
  drivingProgress: 0,   // 0 = fully parked, 1 = full speed
  drivingDirection: 1,  // +1 = scrolling down, -1 = scrolling up
  totalSections: 5,
  targetHubAngle: 0,    // target Y rotation for hub snap (set by scrollManager)
  hubSnapNeeded: false, // flag for scene.js to trigger snap tween
};
