import { ElementSelectorType } from "../enums/element-selector-type";

export interface IScript {
    loaded?: boolean;
    name: string;
    src: string;
    id?: string;
    async?: boolean;
    defer?: boolean;
}

export interface IElementSelector {
    name: string;
    type: ElementSelectorType;
}
