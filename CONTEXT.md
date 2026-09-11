# JumpKey

A Chrome extension that turns parameterized URL templates into short keyboard commands. Local-first, keyboard-first, no backend.

## Language

**Command**:
A user-defined mapping from a Keyword to a Template, plus its settings (open mode, name).
_Avoid_: Shortcut, bookmark, rule, entry

**Keyword**:
The primary trigger token that identifies a Command at the start of an Invocation.
_Avoid_: Trigger, name, prefix, command name

**Alias**:
A secondary trigger token that resolves to the same Command as its Keyword.
_Avoid_: Synonym, alternate keyword

**Template**:
The URL pattern stored on a Command, containing zero or more Variables.
_Avoid_: URL pattern, format, route

**Variable**:
A named slot in a Template, written `{name}`, filled by an Argument at invocation time.
_Avoid_: Placeholder, parameter, param, token, field

**Argument**:
A value the user supplies in an Invocation to fill a Variable.
_Avoid_: Parameter, value, input, arg (outside code)

**Invocation**:
One typed line in the launcher: a Keyword (or Alias) followed by Arguments.
_Avoid_: Query, input, request, call

**Launcher**:
The UI surface where the user types an Invocation. Currently the extension action popup.
_Avoid_: Palette, command palette, omnibox (that is a distinct, secondary surface)

**Open mode**:
Where the rendered URL is loaded: the current tab or a new foreground tab.
_Avoid_: Target, navigation behavior, tab mode

**Slot**:
A part of a concrete URL (host label, path segment, query value, hash segment) that the variable picker lets the user turn into a Variable.
_Avoid_: Segment, part, chip (chip is the UI rendering of a Slot)

**Shortcut**:
Reserved for keyboard shortcuts only (e.g. the global shortcut that opens the Launcher). Never a synonym for Command.
