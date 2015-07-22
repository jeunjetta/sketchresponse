import jsondiffpatch from 'jsondiffpatch';

export const VERSION = '0.1';

export default class HistoryManager {
  constructor(config, messageBus, stateManager) {
    this.config = config;
    this.messageBus = messageBus;
    this.stateManager = stateManager;

    this.currentState = undefined;
    this.undoStack = [];
    this.redoStack = [];
    messageBus.on('addUndoPoint', this.addUndoPoint.bind(this));
    messageBus.on('undo', this.undo.bind(this));
    messageBus.on('redo', this.redo.bind(this));
    messageBus.on('ready', () => { this.currentState = this.getUndoableState(); });
    messageBus.on('stateSet', () => { this.currentState = this.getUndoableState(); });

    messageBus.emit('registerState', {
      id: '$__history',
      dataVersion: VERSION,
      getState: () => {
        const state = {
          undoStack: this.undoStack.slice(-5),  // Only keep the 5 most recent undos
          redoStack: this.redoStack.slice(-3),  // Only keep the 3 most recent redos
        };
        return btoa(JSON.stringify(state));
      },
      setState: state => {
        const decoded = JSON.parse(atob(state));
        this.undoStack = decoded.undoStack;
        this.redoStack = decoded.redoStack;
      },
    });
  }

  getUndoableState() {
    const state = this.stateManager.getPluginState();
    // TODO: don't hard code this
    delete state.$__history;
    delete state.$__toolbar;
    return state;
  }

  addUndoPoint() {
    if (!this.currentState) {
      throw new Error('Cannot add an undo point before the application has finished loading.');
    }

    const newState = this.getUndoableState();
    const diff = jsondiffpatch.diff(this.currentState, newState);

    this.undoStack.push(diff);
    this.redoStack = [];
    this.currentState = newState;
  }

  undo() {
    if (this.undoStack.length <= 0) return;

    const diff = this.undoStack.pop();
    this.redoStack.push(diff);

    this.currentState = jsondiffpatch.unpatch(this.currentState, diff);
    this.stateManager.setPluginState(this.currentState);
  }

  redo() {
    if (this.redoStack.length <= 0) return;

    const diff = this.redoStack.pop();
    this.undoStack.push(diff);

    this.currentState = jsondiffpatch.patch(this.currentState, diff);
    this.stateManager.setPluginState(this.currentState);
  }
}
