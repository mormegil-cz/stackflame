declare module 'd3-flame-graph' {
    export interface Flamegraph {
        /// Defines if the plugin should use the self value logic to calculate the node value for the Flame Graph frame size. If set to true, it will assume the node value from the input callgraph represents only the internal node value, or self value, not the sum of all children. If set to false it will assume the value includes the chidren values too. Defaults to false if not explicitely set, which if the same behavior 1.x had.
        selfValue(enabled?: boolean): Flamegraph;

        /// Graph width in px. Defaults to 960px if not set. If size is specified, it will set the graph width, otherwise it will return the current graph width.
        width(size?: number): Flamegraph;

        /// Graph height in px. Defaults to the number of cell rows times cellHeight if not set. If size is specified, it will set the cell height, otherwise it will return the current graph height.
        height(size?: number): Flamegraph;

        /// Cell height in px. Defaults to 18px if not set. If size is specified, it will set the cell height, otherwise it will return the current cell height.
        cellHeight(size?: number): Flamegraph;

        /// Minimum size of a frame, in px, to be displayed in the flame graph. Defaults to 0px if not set. If size is specified, it will set the minimum frame size, otherwise it will return the current minimum frame size.
        minFrameSize(size?: number): Flamegraph;

        /// Title displayed on top of graph. Defaults to empty if not set. If title is specified, it will set the title displayed on the graph, otherwise it will return the current title.
        title(title?: string): Flamegraph;

        /// Enables/disables display of tooltips on frames. Defaults to true if not set. It can be set to a d3-tip configurable function, which will replace the default function and display a fully customized tooltip. Else, if a truthy value, uses a default label function. If a value is specified, it will enable/disable tooltips, otherwise it will return the current tooltip configuration.
        /// Class should be specified in order to correctly render the tooltip. The default "d3-flame-graph-tip" is available for use too.
        /// `.attr('class', 'd3-flame-graph-tip')`
        /// See d3-tip for more details.
        tooltip(enabled?: boolean): Flamegraph;

        /// Specifies transition duration in milliseconds. The default duration is 750ms. If duration is not specified, returns the current transition duration.
        /// See d3.duration.
        transitionDuration(duration?: number): Flamegraph;

        /// Specifies the transition easing function. The default easing function is d3.easeCubic.
        /// See d3-ease.
        transitionEase(ease?: (normalizedTime: number) => number): Flamegraph;

        /// Adds a function that returns a formatted label. Example:
        ///
        ///        flamegraph.label(function(d) {
        ///    return "name: " + d.name + ", value: " + d.value;
        /// });
        /// ```
        label(formatter?: (datum: any) => string): Flamegraph;

        /// Enables/disables sorting of children frames. Defaults to true if not set to sort in ascending order by frame's name. If set to a function, the function takes two frames (a,b) and returns -1 if frame a is less than b, 1 if greater, or 0 if equal. If a value is specified, it will enable/disable sorting, otherwise it will return the current sort configuration.
        sort(enabled?: boolean): Flamegraph;

        /// Invert the flame graph direction. A top-down visualization of the flame graph, also known as icicle plot. Defaults to false if not set. If a value is specified, it will enable/disable the inverted flame graphs direction, otherwise it will return the current inverted configuration.
        inverted(inverted?: boolean): Flamegraph;

        /// Use the differential color hash. Frames are sized according to their value but colored based on the delta property. Blue for negative numbers, red for positive numbers.
        differential(differential?: boolean): Flamegraph;

        /// Use the elided color hash to show elided frames in a differential heat map. The elided color hash is cold / blue to differentiate from the regular warm palette.
        elided(elided?: boolean): Flamegraph;

        /// Resets the zoom so that everything is visible.
        resetZoom(): Flamegraph;

        /// Adds a function that will be called when the user clicks on a frame. Example:
        /// ```
        ///    flamegraph.onClick(function (d) {
        ///        console.info("You clicked on frame "+ d.data.name);
        ///    });
        /// ```
        onClick(handler: Function): Flamegraph;

        /// If called with no arguments, onClick will return the click handler.
        onClick(): Function;

        /// Sets the element that should be updated with the focused sample details text. Example:
        /// ```
        ///    <div id="details">
        ///    </div>
        ///
        ///    flamegraph.setDetailsElement(document.getElementById("details"));
        /// ```
        setDetailsElement(element: Element): Flamegraph;

        /// If called with no arguments, setDetailsElement will return the current details element.
        setDetailsElement(): Element;

        /// Sets the handler function that is called when the details element needs to be updated. The function receives a single paramenter, the details text to be set. Example:
        /// ```
        /// flamegraph.setDetailsHandler(
        ///   function (d) {
        ///     if (detailsElement) {
        ///       if (d) {
        ///         detailsElement.innerHTML = d
        ///       } else {
        ///         if (searchSum) {
        ///           setSearchDetails()
        ///         } else {
        ///           detailsElement.innerHTML = ''
        ///         }
        ///       }
        ///     }
        ///   }
        /// );
        /// ```
        /// If not set, setDetailsHandler will default to the above function.
        /// If called with no arguments, setDetailsHandler will reset the details handler function.
        setDetailsHandler(handler?: Function): Flamegraph;

        /// Sets the handler function that is called when search results are returned. The function receives a three paramenters, the search results array, the search sample sum, and root value, Example:
        /// ```
        /// flamegraph.setSearchHandler(
        ///   function (searchResults, searchSum, totalValue) {
        ///     if (detailsElement) { detailsElement.innerHTML = `${searchSum} of ${totalValue} samples (${format('.3f')(100 * (searchSum / totalValue), 3)}%)`}
        ///   }
        /// );
        /// ```
        /// If not set, setSearchHandler will default to the above function.
        /// 
        /// If called with no arguments, setSearchHandler will reset the search handler function.
        setSearchHandler(handler?: Function): Flamegraph;

        /// Replaces the built-in node color hash function. Function takes two arguments, the node data structure and the original color string for that node. It must return a color string. Example:
        /// ```
        /// // Purple if highlighted, otherwise the original color
        /// flamegraph.setColorMapper(function(d, originalColor) {
        ///     return d.highlight ? "#E600E6" : originalColor;
        /// });
        /// ```
        /// If called with no arguments, setColorMapper will return reset the color hash function.
        setColorMapper(handler?: Function): Flamegraph;

        /// Replaces the built-in node search match function. Function takes two arguments, the node data structure and the search term. It must return a boolean. Example:
        /// ```
        /// flamegraph.setSearchMatch(function(d, term) {
        ///   // Non-regex implementation of the search function
        ///   return d.data.name.indexOf(term) != 0;
        /// })
        /// ```
        /// If called with no arguments, setSearchMatch will return reset the search match function.
        setSearchMatch(matcher?: Function): Flamegraph;

        clear(): void;
        search(term: string): void;
    }

    export function flamegraph(): Flamegraph;
}
