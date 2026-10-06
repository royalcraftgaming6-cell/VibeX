class Queue {
  constructor() {
    this.tracks = [];
    this.previousTracks = [];
  }

  add(track) {
    this.tracks.push(track);
  }

  addMany(tracks) {
    this.tracks.push(...tracks);
  }

  next() {
    return this.tracks.shift() || null;
  }

  remove(index) {
    if (index >= 0 && index < this.tracks.length) {
      return this.tracks.splice(index, 1)[0];
    }
    return null;
  }

  clear() {
    this.tracks = [];
  }

  shuffle() {
    for (let i = this.tracks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.tracks[i], this.tracks[j]] = [this.tracks[j], this.tracks[i]];
    }
  }

  size() {
    return this.tracks.length;
  }

  isEmpty() {
    return this.tracks.length === 0;
  }

  getAll() {
    return [...this.tracks];
  }
}

module.exports = Queue;
