import cheerio from 'cheerio';

type YoutubeMetaData = {
    title: string;
    description: string;
    keywords: string;
    shortlinkUrl: string;
    embedinfo: {
        title: string;
        author_name: string;
        author_url: string;
        type: string;
        height: number;
        width: number;
        version: string;
        provider_name: string;
        provider_url: string;
        thumbnail_height: number;
        thumbnail_width: number;
        thumbnail_url: string;
        html: string;
    };
};

export default function getYouTubeMetaData(fetch, youtube): Promise<YoutubeMetaData> {
    return new Promise(async (ok, erro) => {
        if (/((http|https):\/\/)?(www\.)?((youtube\.com)|(youtu\.be))(\/)?([a-zA-Z0-9\-\.]+)\/?/.test(youtube)) {
            try {
                const body = await (await fetch(youtube)).text(),
                    $ = cheerio.load(body),
                    title = $(`meta[name="title"]`).attr('content'),
                    description = $(`meta[name="description"]`).attr('content'),
                    keywords = $(`meta[name="keywords"]`).attr('content'),
                    shortlinkUrl = $(`link[rel="shortlinkUrl"]`).attr('href'),
                    ur = $(`link[type="application/json+oembed"]`).attr('href');
                const iem = ur && ur != '' ? await (await fetch(ur.replace('http:', 'https:'))).text() : undefined;
                const embedinfo = ur ? (iem ? JSON.parse(iem) : null) : null;
                ok({ title, description, keywords, shortlinkUrl, embedinfo });
            } catch (e) {
                erro({ message: 'Error', errorcode: 2, erroca: e });
            }
        } else {
            erro({ message: 'Non Valid youtube Link!', errorcode: 1 });
        }
    });
}
