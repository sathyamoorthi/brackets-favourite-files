/*
The MIT License (MIT)

Copyright (c) 2014 Sathyamoorthi <sathyamoorthi10@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

define(function (require, exports, module) {
    "use strict";
    
    var AppInit                 = brackets.getModule("utils/AppInit"),
        ExtensionUtils          = brackets.getModule("utils/ExtensionUtils"),
        FileUtils               = brackets.getModule("file/FileUtils"),
        Menus                   = brackets.getModule("command/Menus"),
        Commands                = brackets.getModule("command/Commands"),
        CommandManager          = brackets.getModule("command/CommandManager"),
        PreferencesManager      = brackets.getModule("preferences/PreferencesManager"),
        MainViewManager         = brackets.getModule("view/MainViewManager"),
        WorkspaceManager        = brackets.getModule("view/WorkspaceManager"),
        PreferencesManager      = brackets.getModule("preferences/PreferencesManager"),
        _                       = brackets.getModule("thirdparty/lodash"),
        PanelTemplate           = require("text!templates/panel.html"),
        ItemTemplate            = require("text!templates/panel-item.html"),
        WorkingSetContextMenu   = Menus.getContextMenu(Menus.ContextMenuIds.WORKING_SET_CONTEXT_MENU);
        
    var namespace       = "favouritefiles",
        panel           = WorkspaceManager.createBottomPanel(namespace + "-panel", $(Mustache.render(PanelTemplate)), 100),
        preference      = PreferencesManager.getExtensionPrefs(namespace),
        toggleID        = namespace + ".menu",
        cmdShowPanel    = "Show Favourite Files Panel",
        cmdHidePanel    = "Hide Favourite Files Panel",
        favouriteFiles;
    
    function init() {
        var $table = panel.$panel.find("tbody");
        
        //do model initialization
        if (typeof favouriteFiles === "undefined") {
            favouriteFiles = preference.get("files");
            
            favouriteFiles.forEach(function(item){
                $table.append(Mustache.render(ItemTemplate, {file: item.name, path: item.path}));
            });
        }
    }
    
    function addToFavourite(name, path) {
        var index = _.findIndex(favouriteFiles, {path: path}), 
            $table = panel.$panel.find("tbody"),
            $target, dom;
        
        if (index === -1) {        
            favouriteFiles.push({name: name, path: path});

            favouriteFiles.sort(function(obj1, obj2){
                return FileUtils.compareFilenames(obj1.name, obj2.name, false);
            });

            //get sorted index
            index   = _.findIndex(favouriteFiles, {path: path});
            dom     = Mustache.render(ItemTemplate, {file: name, path: path});
            $target = $table.find("> tr:nth-child(" + (index + 1) + ")");
            
            if (index === 0) {                
                $table.prepend(dom);                
            } else if ($target.length > 0) {
                $target.before(dom);
            } else {
                $table.append(dom);                
            }
            
            panel.show();
        }
    }
    
    function updateCount() {
        var $title = panel.$panel.find(".title"), count = favouriteFiles.length;
        
        $title.html("Favourite Files " + ((count > 0) ? "(" + count + ")" : ""));
    }
    
    function savePreference() {
        updateCount();
        preference.set("files", favouriteFiles);
    }
    
    function favoriteFile() {
        var file = MainViewManager.getCurrentlyViewedFile(MainViewManager.ACTIVE_PANE);
        
        if (file) {
            init();
            addToFavourite(file.name, file.fullPath);
            savePreference();
        }        
    }
    
    function toggleFavouritesPanel() {
        var panelVisibility = $("#" + namespace + "-panel").is(":visible");
        
        init();
        updateCount();        
        
        if (panelVisibility) {
            panel.hide();
            CommandManager.get(toggleID).setName(cmdShowPanel);
        } else {
            panel.show();
            CommandManager.get(toggleID).setName(cmdHidePanel);
        }
    }
    
    AppInit.appReady(function () {
        ExtensionUtils.loadStyleSheet(module, "css/main.css");
    });
    
    CommandManager.register("Add to Favourites", namespace, function () {
        favoriteFile();
    });
    
    WorkingSetContextMenu.addMenuItem(namespace, "", Menus.AFTER, Commands.FILE_RENAME);
    
    panel.$panel
        .on("click." + namespace, ".close", function() {
            panel.hide();
        })
        .on("mouseover." + namespace, "tr", function() {
            $(this).find("button").show();
        })
        .on("mouseleave." + namespace, "tr", function() {
            $(this).find("button").hide();
        })
        .on("click." + namespace, "tr", function(){
            var filePath = $(this).find(".favouritefile-path").text();        
            CommandManager.execute(Commands.FILE_OPEN, {fullPath: filePath});
        })
        .on("click." + namespace, "button", function(event) {
            var $tr = $(event.currentTarget).closest("tr"),
                filePath = $tr.find(".favouritefile-path").text();
        
            event.stopPropagation();
            event.preventDefault();
        
            $tr.remove(); //remove from view
            _.remove(favouriteFiles, {path: filePath}); //remove from model
            savePreference();
        });
    
    //define preference
    preference.definePreference("files",  "array", []);
    
    // add menu to access favourite files
    var menu = Menus.getMenu(Menus.AppMenuBar.NAVIGATE_MENU), menu;
    
    menu = Menus.getMenu(Menus.AppMenuBar.VIEW_MENU);
    CommandManager.register(cmdShowPanel, toggleID, toggleFavouritesPanel);
    menu.addMenuItem(toggleID, "Ctrl-Alt-F");
});