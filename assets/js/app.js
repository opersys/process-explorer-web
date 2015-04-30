/*
 * Copyright (C) 2014-2015, Opersys inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Applications entry point.

var resizeWindow = function () {
    var tabsContainer;

    tabsContainer = $("#tabsContainer");

    tabsContainer
        .width($(window).width())
        .height($(window).height());

    // Change the size of the target div.
    if (Applications[w2ui["tabs"].active] && Applications[w2ui["tabs"].active].object != null)
        Applications[w2ui["tabs"].active].object.resize(
            tabsContainer.width(),
            tabsContainer.height() - $("#tabs").height());
};

var Applications = {};

var createTabApp = function (caption, optionObj, createObjectFun) {
    var tabContainer, tabDiv, tabId = _.uniqueId("tab");

    tabContainer = $("#tabsContainer");
    tabDiv = $("<div></div>")
        .attr("id", tabId)
        .attr("class", "tab");
    tabContainer.append(tabDiv);

    w2ui["tabs"].add({
        id: tabId,
        caption: caption
    });

    Applications[tabId] = {
        activate: function () {
            return createObjectFun(tabDiv, optionObj)
        },
        object: null
    };
};

var activateApp = function (tabId) {
    var tabContainer;

    tabContainer = $("#tabsContainer");

    w2ui["tabs"].select(tabId);

    // Hide all the other tabs.
    $('#tabsContainer .tab').hide();

    // Deactivate the other tab.
    if (tabId != w2ui["tabs"].active)
        Applications[tabId].deactivate();

    // Show the tab div immediately.
    $("#tabsContainer #" + tabId).show();

    // Create the view object if it's not already created.
    if (!Applications[tabId].object)
        Applications[tabId].object = Applications[tabId].activate();

    // Activate and properly size the tab content.
    Applications[tabId].object.activate();
    Applications[tabId].object.resize(
        tabContainer.width(),
        tabContainer.height() - $("#tabs").height());
};

$(document).ready(function () {
    var options = new Options();

    options.fetch();
    options.initOption("pidFilterMode", false);
    options.initOption("rowColorMode", false);
    options.initOption("paused", false);
    options.initOption("delay", 5000);
    options.initOption("graphDelay", 2000);
    options.initOption("maximizeLogcat", false);
    options.initOption("minimizeLogcat", false);
    options.initOption("filterError", true);
    options.initOption("filterWarning", true);
    options.initOption("filterInfo", true);
    options.initOption("filterDebug", true);
    options.initOption("filterVerbose", true);

    $("#tabs").w2tabs({
        name: "tabs",
        onClick: function (event) {
            activateApp(event.target);
        },
        style: "display: hidden"
    });

    createTabApp("Processes", options, function (targetObj, optObj) {
        return new ProcessTab({
            target: targetObj,
            options: optObj
        });
    });

    options.activate();

    $(window).resize($.debounce(100, resizeWindow));

    // Reformat the window content.
    resizeWindow();

    // Activate and resize the first application.
    firstTab = w2ui["tabs"].tabs[0].id;
    activateApp(firstTab);
});
