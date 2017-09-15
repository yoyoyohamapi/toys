class Stack {
  constructor(size) {
    this.list = []
    this.size = size
  }

  push(elem) {
    const length = this.list.length
    if (length === this.size) {
      this.list.shift()
    }
    this.list.push(elem)
  }

  pop(elem) {
    if (!this.isEmpty()) {
      return this.list.pop()
    }
  }

  isEmpty() {
    return this.list.length <= 0
  }
}

export default Stack
