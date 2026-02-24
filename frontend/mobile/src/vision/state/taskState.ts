export class TaskState {
  expectedHeightM: number;
  outtriggerRequired: boolean;
  workMode: string;
  startedAt: number;

  constructor(
    workMode: string = 'unknown',
    expectedHeightM: number = 0,
    outtriggerRequired: boolean = false,
  ) {
    this.workMode = workMode;
    this.expectedHeightM = expectedHeightM;
    this.outtriggerRequired = outtriggerRequired;
    this.startedAt = 0;
  }

  start(): void {
    this.startedAt = Date.now() / 1000;
  }
}
