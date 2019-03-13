import { Terminal } from 'xterm'
import * as fit from 'xterm/lib/addons/fit/fit';

Terminal.applyAddon(fit);

class Term {
  term: Terminal;
  input: string = '';
  history: string[] = [];
  listener: (input: string) => string;
  state: ('single_line'|'multi_line') = 'single_line';

  prompt() {
    switch(this.state) {
      case 'single_line':
        this.term.write('minidb> ');
        break;
      case 'multi_line':
        this.term.write('   ...> ');
        break;
    }
  }

  constructor(container: HTMLElement) {
    this.term = new Terminal({
      'fontFamily': 'consolas',
      'theme': {
        'background': '#272822',
        'foreground': '#CCC'
      }
    });
    this.term.open(container);
    // @ts-ignore
    this.term.fit();
    window.onresize = _ => {
      // @ts-ignore
      this.term.fit();
    }
    this.term.writeln('Welcome to MiniDB!');
    this.prompt();

    this.term.on('key', (key, ev) => {
      if (ev.key.length == 1) {
        // a printable char
        this.term.write(key);
        this.input += key
        return;
      }

      // control keys
      switch (ev.key) {
        case 'Enter':
          this.term.writeln('');

          let str = this.input.trimRight();
          if (str[str.length - 1] != ';') {
            this.state = 'multi_line';
            this.input += ' ';
          } else {
            console.log(this.input);
            let res: string;
            try {
              res = this.listener(this.input);
              this.term.writeln(res.trim());
            } catch (error) {
              console.log(error);
              this.term.writeln('parse error');
            }
            this.history.push(this.input);
            this.input = ''
            this.state = 'single_line';
          }
          this.prompt();
          break;
        case 'Backspace':
        case 'Delete':
          if (this.input.length > 0) {
            this.term.write('\b \b');
            this.input = this.input.substr(0, this.input.length - 1)
          }
          break;
        default:
          break;
      }
    })
  }

}

export { Term };
