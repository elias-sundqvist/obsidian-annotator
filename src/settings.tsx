import AnnotatorPlugin from 'main';
import { App, PluginSettingTab, Setting } from 'obsidian';
import { callDelayer } from 'utils';

export interface AnnotatorSettings {
    deafultDarkMode: boolean;
    darkReaderSettings: {
        brightness: number;
        contrast: number;
        sepia: number;
    };
    customDefaultPath: string;
    epubSettings: {
        readingMode: 'scroll' | 'pagination';
        fontSize: number;
    };
    annotationMarkdownSettings: {
        annotationModeByDefault: boolean;
        includePrefix: boolean;
        highlightHighlightedText: boolean;
        includePostfix: boolean;
    };
    annotateTvUrl?: string;
    debugLogging: boolean;
}

export const DEFAULT_SETTINGS: AnnotatorSettings = {
    deafultDarkMode: false,
    darkReaderSettings: {
        brightness: 150,
        contrast: 85,
        sepia: 0
    },
    debugLogging: false,
    customDefaultPath: '',
    epubSettings: {
        readingMode: 'pagination',
        fontSize: 100
    },
    annotationMarkdownSettings: {
        annotationModeByDefault: true,
        includePrefix: true,
        highlightHighlightedText: true,
        includePostfix: true
    }
};

export interface IHasAnnotatorSettings {
    settings: AnnotatorSettings;
}

export default class AnnotatorSettingsTab extends PluginSettingTab {
    plugin: AnnotatorPlugin;

    constructor(app: App, plugin: AnnotatorPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        containerEl.createEl('h2', { text: 'Annotator Settings' });

        containerEl.createEl('h3', { text: 'Annotation Target Settings' });

        new Setting(containerEl)
            .setName('Custom Default Path')
            .setDesc(
                [
                    'If the provided annotation target is not found, ',
                    'Annotator will try prepending this string to the path. ',
                    'This can be useful if, for example, all your notes are ',
                    'located at a specific remote location.'
                ].join('')
            )
            .addText(text =>
                text.setValue(this.plugin.settings.customDefaultPath).onChange(async value => {
                    this.plugin.settings.customDefaultPath = value;
                    await this.plugin.saveSettings();
                })
            );

        containerEl.createEl('h3', { text: 'Epub Reader Settings' });

        new Setting(containerEl).setName('Epub reader mode').addDropdown(dropdown =>
            dropdown
                .addOption('scroll', 'Scroll')
                .addOption('pagination', 'Pagination')
                .setValue(this.plugin.settings.epubSettings.readingMode)
                .onChange(async value => {
                    this.plugin.settings.epubSettings.readingMode = value as 'scroll' | 'pagination';
                    await this.plugin.saveSettings();
                })
        );

        const epubFontSize = new Setting(containerEl)
            .setName('Font Size')
            .setDesc(`Base fron size in percents. Current: ${this.plugin.settings.epubSettings.fontSize}%`);

        epubFontSize.addSlider(slider =>
            slider
                .setLimits(50, 200, 5)
                .setValue(this.plugin.settings.epubSettings.fontSize)
                .onChange(async value => {
                    this.plugin.settings.epubSettings.fontSize = value;
                    epubFontSize.setDesc(
                        `Base fron size in percents. Current: ${this.plugin.settings.epubSettings.fontSize}%`
                    );
                    slider.setDynamicTooltip();
                    await this.plugin.saveSettings();
                })
        );

        containerEl.createEl('h3', { text: 'Annotation Markdown Settings' });

        new Setting(containerEl)
            .setName('Use Annotation Mode By Default')
            .setDesc('Whether to use annotation mode by default when opening a note with annotation-target')
            .addToggle(toggle =>
                toggle
                    .setValue(this.plugin.settings.annotationMarkdownSettings.annotationModeByDefault)
                    .onChange(async value => {
                        this.plugin.settings.annotationMarkdownSettings.annotationModeByDefault = value;
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName('Include Prefix')
            .setDesc(
                'Whether to include the %%PREFIX%% region of the annotation markdown. Allows you to see some text before the highlighted region.'
            )
            .addToggle(toggle =>
                toggle.setValue(this.plugin.settings.annotationMarkdownSettings.includePrefix).onChange(async value => {
                    this.plugin.settings.annotationMarkdownSettings.includePrefix = value;
                    await this.plugin.saveSettings();
                })
            );

        new Setting(containerEl)
            .setName('Include Postfix')
            .setDesc(
                'Whether to include the %%POSTFIX%% region of the annotation markdown. Allows you to see some text after the highlighted region.'
            )
            .addToggle(toggle =>
                toggle
                    .setValue(this.plugin.settings.annotationMarkdownSettings.includePostfix)
                    .onChange(async value => {
                        this.plugin.settings.annotationMarkdownSettings.includePostfix = value;
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName('Highlight highlighted text')
            .setDesc(
                'Whether to wrap the %%HIGHLIGHT%% region text in == ==, so that the text becomes highlighted. Useful for distinguishing the highlight from the pre- and postfix.'
            )
            .addToggle(toggle =>
                toggle
                    .setValue(this.plugin.settings.annotationMarkdownSettings.highlightHighlightedText)
                    .onChange(async value => {
                        this.plugin.settings.annotationMarkdownSettings.highlightHighlightedText = value;
                        await this.plugin.saveSettings();
                    })
            );

        containerEl.createEl('h3', { text: 'Dark Mode Settings' });

        new Setting(containerEl)
            .setName('Use Dark Mode By Default')
            .setDesc('Whether to use dark mode by default when opening pdfs/epubs.')
            .addToggle(toggle =>
                toggle.setValue(this.plugin.settings.deafultDarkMode).onChange(async value => {
                    this.plugin.settings.deafultDarkMode = value;
                    await this.plugin.saveSettings();
                })
            );

        new Setting(containerEl)
            .setName('Sepia')
            .setDesc('The amount of sepia in dark mode')
            .addSlider(slider =>
                slider
                    .setLimits(0, 100, 1)
                    .setValue(this.plugin.settings.darkReaderSettings.sepia)
                    .onChange(async value => {
                        this.plugin.settings.darkReaderSettings.sepia = value;
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName('Contrast')
            .setDesc('The amount of contrast in dark mode')
            .addSlider(slider =>
                slider
                    .setLimits(50, 150, 1)
                    .setValue(this.plugin.settings.darkReaderSettings.contrast)
                    .onChange(async value => {
                        this.plugin.settings.darkReaderSettings.contrast = value;
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName('Brightness')
            .setDesc('The amount of brightness in dark mode')
            .addSlider(slider =>
                slider
                    .setLimits(50, 150, 1)
                    .setValue(this.plugin.settings.darkReaderSettings.brightness)
                    .onChange(async value => {
                        this.plugin.settings.darkReaderSettings.brightness = value;
                        await this.plugin.saveSettings();
                    })
            );

        containerEl.createEl('h3', { text: 'Annotate.TV settings' });

        const resourceUrlUpdateDelayer = callDelayer();

        new Setting(containerEl)
            .setName('Annotate.tv resource URL')
            .setDesc('Not bundled with the plugin due to potential copyright issues.')
            .addText(text =>
                text.setValue(this.plugin.settings.annotateTvUrl).onChange(async value => {
                    this.plugin.settings.annotateTvUrl = value;
                    resourceUrlUpdateDelayer(async () => {
                        await this.plugin.unloadResources();
                        await this.plugin.loadResources();
                    }, 2000);
                    await this.plugin.saveSettings();
                })
            );

        containerEl.createEl('h3', { text: 'Developer Settings' });

        new Setting(containerEl)
            .setName('Enable Debug Logging')
            .setDesc('If this is enabled, more things are printed to the console.')
            .addToggle(toggle =>
                toggle.setValue(this.plugin.settings.debugLogging).onChange(async value => {
                    this.plugin.settings.debugLogging = value;
                    await this.plugin.saveSettings();
                })
            );
    }
}
