import { defineConfig } from 'tinacms';

export default defineConfig({
  branch: 'main',
  clientId: process.env.TINA_CLIENT_ID || 'local',
  token: process.env.TINA_TOKEN || '',
  build: {
    outputDir: 'admin',
  },
  media: {
    tina: {
      mediaRoot: 'images',
      targetPath: '/images',
    },
  },
  schema: {
    collections: [
      {
        label: 'Blog Posts',
        name: 'blog',
        path: 'content/blog',
        format: 'md',
        fields: [
          {
            type: 'object',
            list: false,
            name: 'frontmatter',
            label: 'Post Metadata',
            ui: {
              itemProps: (item) => {
                return { label: item?.title };
              },
            },
            fields: [
              {
                type: 'string',
                name: 'title',
                label: 'Title',
                isTitle: true,
                required: true,
              },
              {
                type: 'string',
                name: 'author',
                label: 'Author',
              },
              {
                type: 'string',
                name: 'date',
                label: 'Date',
                ui: {
                  component: 'datetime',
                },
              },
              {
                type: 'string',
                name: 'description',
                label: 'Description',
                ui: {
                  component: 'textarea',
                },
              },
              {
                type: 'image',
                name: 'image',
                label: 'Featured Image',
              },
            ],
          },
          {
            type: 'rich-text',
            isBody: true,
            name: 'body',
            label: 'Body',
            isTitle: false,
            templates: [
              {
                name: 'Quote',
                label: 'Quote',
                ui: {
                  defaultItem: {
                    children: [{ type: 'p', children: [{ text: '' }] }],
                  },
                },
                fields: [
                  {
                    name: 'children',
                    label: 'Quote text',
                    ui: {
                      component: 'textarea',
                    },
                  },
                ],
              },
            ],
          },
        ],
        ui: {
          router: ({ document }) => {
            return `/blog/${document._sys.filename}`;
          },
        },
      },
    ],
  },
});
