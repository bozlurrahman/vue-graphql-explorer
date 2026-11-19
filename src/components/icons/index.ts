import { defineComponent, h } from 'vue';

// Import SVG modules
import _ArgumentIcon from './argument.svg?raw';
import _ChevronDownIcon from './chevron-down.svg?raw';
import _ChevronLeftIcon from './chevron-left.svg?raw';
import _ChevronUpIcon from './chevron-up.svg?raw';
import _CloseIcon from './close.svg?raw';
import _CopyIcon from './copy.svg?raw';
import _DeprecatedArgumentIcon from './deprecated-argument.svg?raw';
import _DeprecatedEnumValueIcon from './deprecated-enum-value.svg?raw';
import _DeprecatedFieldIcon from './deprecated-field.svg?raw';
import _DirectiveIcon from './directive.svg?raw';
import _DocsFilledIcon from './docs-filled.svg?raw';
import _DocsIcon from './docs.svg?raw';
import _EnumValueIcon from './enum-value.svg?raw';
import _FieldIcon from './field.svg?raw';
import _HistoryIcon from './history.svg?raw';
import _ImplementsIcon from './implements.svg?raw';
import _KeyboardShortcutIcon from './keyboard-shortcut.svg?raw';
import _MagnifyingGlassIcon from './magnifying-glass.svg?raw';
import _MergeIcon from './merge.svg?raw';
import _PenIcon from './pen.svg?raw';
import _PlayIcon from './play.svg?raw';
import _PlusIcon from './plus.svg?raw';
import _PrettifyIcon from './prettify.svg?raw';
import _ReloadIcon from './reload.svg?raw';
import _RootTypeIcon from './root-type.svg?raw';
import _SettingsIcon from './settings.svg?raw';
import _StarFilledIcon from './star-filled.svg?raw';
import _StarIcon from './star.svg?raw';
import _StopIcon from './stop.svg?raw';
import _TrashIcon from './trash.svg?raw';
import _TypeIcon from './type.svg?raw';

function generateIcon(svg: string) {
  return defineComponent({
    name: 'GeneratedIcon',
    render() {
      return h('span', { innerHTML: svg });
    },
  });
}

// Export Vue components exactly like React version
export const ArgumentIcon = generateIcon(_ArgumentIcon);
export const ChevronDownIcon = generateIcon(_ChevronDownIcon);
export const ChevronLeftIcon = generateIcon(_ChevronLeftIcon);
export const ChevronUpIcon = generateIcon(_ChevronUpIcon);
export const CloseIcon = generateIcon(_CloseIcon);
export const CopyIcon = generateIcon(_CopyIcon);
export const DeprecatedArgumentIcon = generateIcon(_DeprecatedArgumentIcon);
export const DeprecatedEnumValueIcon = generateIcon(_DeprecatedEnumValueIcon);
export const DeprecatedFieldIcon = generateIcon(_DeprecatedFieldIcon);
export const DirectiveIcon = generateIcon(_DirectiveIcon);
export const DocsFilledIcon = generateIcon(_DocsFilledIcon);
export const DocsIcon = generateIcon(_DocsIcon);
export const EnumValueIcon = generateIcon(_EnumValueIcon);
export const FieldIcon = generateIcon(_FieldIcon);
export const HistoryIcon = generateIcon(_HistoryIcon);
export const ImplementsIcon = generateIcon(_ImplementsIcon);
export const KeyboardShortcutIcon = generateIcon(_KeyboardShortcutIcon);
export const MagnifyingGlassIcon = generateIcon(_MagnifyingGlassIcon);
export const MergeIcon = generateIcon(_MergeIcon);
export const PenIcon = generateIcon(_PenIcon);
export const PlayIcon = generateIcon(_PlayIcon);
export const PlusIcon = generateIcon(_PlusIcon);
export const PrettifyIcon = generateIcon(_PrettifyIcon);
export const ReloadIcon = generateIcon(_ReloadIcon);
export const RootTypeIcon = generateIcon(_RootTypeIcon);
export const SettingsIcon = generateIcon(_SettingsIcon);
export const StarFilledIcon = generateIcon(_StarFilledIcon);
export const StarIcon = generateIcon(_StarIcon);
export const StopIcon = generateIcon(_StopIcon);
export const TrashIcon = generateIcon(_TrashIcon);
export const TypeIcon = generateIcon(_TypeIcon);
