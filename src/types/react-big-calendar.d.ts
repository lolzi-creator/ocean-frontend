declare module 'react-big-calendar' {
  export interface Event {
    title?: string;
    start?: Date;
    end?: Date;
    resource?: any;
  }
  export function Calendar(props: any): JSX.Element;
  export function momentLocalizer(moment: any): any;
}
