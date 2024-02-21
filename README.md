# IWARA

### Before we get started

#### 💥💥 Warning: Not Suitable For Work 💥💥

There's a **NSFW** website, which contains some **NSFW** vidoes,

but, if you're a anime holic person,

it may help you in the lonely night.

Get lag or stuck in the middle in your happy time?

Why don't you just **download** it?

### Suggest Application Versions

| Application | Version |
| ----------- | ------- |
| NodeJs      | 19^     |

#### How to start it

##### Donwload by single video url

1. Duplicate the file `setting.json.default` to `setting.json`.

2. Get into the website and copy page's url which you want to enjoy it later,  
   the url format should be something like this: `https://www.iwara.tv/video/{some-random-char}`.

> Some url may look like this: `https://www.iwara.tv/video/{some-random-char}/{some-random-char}`  
> And that's okay.

3. Paste the link to the `urls` in `setting.json` like this:

```json
{
  "urls": ["https://www.iwara.tv/video/{some-random-char}"],
  "authors": []
}
```

> Don't forget the `" "` beside the `url`.

if you have more than one urls want to enjoy, paste them like this:

```json
{
  "urls": [
    "https://www.iwara.tv/video/{some-random-char}",
    "https://www.iwara.tv/video/{some-random-char}",
    "https://www.iwara.tv/video/{some-random-char}"
  ],
  "authors": []
}
```

> Don't forget the `,` .

4. run these scripts in your terminal:

```bash
# install packages
pnpm install

# Enjoy
node iwara.js
```

then just wait, after few seconds, you may find your joy in the `saved` folder.

##### Donwload by author

If you really like the art works from a author, this may help you.

1. Duplicate the file `setting.json.default` to `setting.json`.

2. Get into the website and copy author page's url which you like,
   the url format should be something like this: `https://www.iwara.tv/profile/{author-name}`.

3. Paste the link to the `authors` in `setting.json` like this:

```json
{
  "urls": [],
  "authors": ["https://www.iwara.tv/profile/{author-name}"]
}
```

> Don't forget the `" "` beside the `url`.

if you have more than one authors' art works want to enjoy, paste them like this:

```json
{
  "urls": [],
  "authors": [
    "https://www.iwara.tv/profile/{author-name}",
    "https://www.iwara.tv/profile/{author-name}",
    "https://www.iwara.tv/profile/{author-name}"
  ]
}
```

> Don't forget the `,` .

4. run these scripts in your terminal:

```bash
# install packages
pnpm install

# Enjoy
node iwara.js
```

then just wait, after few seconds, you may find your joy in the `saved` folder.

##### Do it all at once

You can do both single url download and author download at once, just make your `setting.json` file lilke this:

```json
{
  "urls": [
    "https://www.iwara.tv/video/2bo02tv5dsqeyogx",
    "https://www.iwara.tv/video/75LIU3C5xE8T96/mmd-mmd-subaru-ass-dancegold",
    "https://www.iwara.tv/video/RumwVBF8XA9Z6i/hololiverainbow-a4kmmd"
  ],
  "authors": [
    "https://www.iwara.tv/profile/{author-name}",
    "https://www.iwara.tv/profile/{author-name}",
    "https://www.iwara.tv/profile/{author-name}"
  ]
}
```

Don't forget the `,` and `" "`, run the script, and the whole night is yours.
