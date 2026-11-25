// Joint anchors follow the supplied cloud robot's large head and compact body.
export const ROBOT_RIG = {
  headR: '80 132', leftArm: '48 140', rightArm: '112 140',
  leftElbow: '42 155', rightElbow: '118 155',
  leftHip: '65 170', rightHip: '95 170', leftKnee: '65 181', rightKnee: '95 181',
  leftFoot: '65 187', rightFoot: '95 187',
} as const;
export const ROBOT_COLORS = { outline: '#263874', screen: '#202a60', cyan: '#8ce5f3', blue: '#6886ef', light: '#89adff', shade: '#4c65c6' } as const;
