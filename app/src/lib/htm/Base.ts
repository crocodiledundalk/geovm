class Base {
  name: string;
  ID: number;
  v1: number;
  v2: number;
  v3: number;

  constructor(n: string, id: number, v1: number, v2: number, v3: number) {
    this.name = n;
    this.ID = id;
    this.v1 = v1;
    this.v2 = v2;
    this.v3 = v3;
  }
}

// export default Base; // Removed default export
export { Base }; // Added named export 