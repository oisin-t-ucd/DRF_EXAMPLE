import { http, HttpResponse } from "msw";
// you can fill this file with the real responses you receive from your backend (copy/paste from chrome developer tools)
// with msw set up, you don't need to use vi.mock in the tests to mock the api requests within each test
export const handlers = [
  http.post("*api/register/", () => {
    return HttpResponse.json(
      {
        status: "SUCCESS",
      },
      { status: 200 },
    );
  }),
  http.post("*api/login/", () => {
    return HttpResponse.json(
      {
        access: "ACCESS_TOKEN",
      },
      { status: 200 },
    );
  }),
  http.get("*api/users/me/", () => {
    return HttpResponse.json({
      id: 1,
      username: "1",
      email: "",
      profile: {
        id: 1,
        bio: "",
        avatar:
          "https://res.cloudinary.com/rxy26w0x/image/upload/v1/media/avatars/profile_fidprj",
      },
    });
  }),
  http.get("*api/courses/", () => {
    return HttpResponse.json({
      count: 8,
      next: "http://localhost:8000/api/courses/?page=2&search=",
      previous: null,
      results: [
        {
          id: 7,
          title: "another",
          description:
            "Lorem ipsum dolor, sit amet consectetur adipisicing elit. Nemo necessitatibus impedit facilis autem rerum qui, fugiat voluptatum voluptates quasi unde odit odio illum! Animi quis quaerat explicabo autem optio et!",
          is_active: true,
          instructor: "1",
          lessons: [
            {
              id: 6,
              title: "aaa",
              content: "aaa",
              order: -2,
            },
            {
              id: 2,
              title: "lesson 2",
              content:
                "Lorem ipsum dolor sit, amet consectetur adipisicing elit. Aspernatur impedit, cumque rerum harum cupiditate consequuntur eos, id earum mollitia placeat, nihil quia natus obcaecati? Deserunt unde cumque nulla laudantium eos!",
              order: 0,
            },
            {
              id: 5,
              title: "another",
              content: "test",
              order: 0,
            },
            {
              id: 1,
              title: "lesson 1",
              content:
                "Lorem ipsum dolor sit, amet consectetur adipisicing elit. Aspernatur impedit, cumque rerum harum cupiditate consequuntur eos, id earum mollitia placeat, nihil quia natus obcaecati? Deserunt unde cumque nulla laudantium eos!",
              order: 999,
            },
          ],
          tags: [
            {
              id: 1,
              name: "test",
            },
            {
              id: 2,
              name: "new",
            },
            {
              id: 3,
              name: "another",
            },
            {
              id: 4,
              name: "test123",
            },
          ],
        },
        {
          id: 6,
          title: "abcd",
          description:
            "Lorem ipsum dolor, sit amet consectetur adipisicing elit. Nemo necessitatibus impedit facilis autem rerum qui, fugiat voluptatum voluptates quasi unde odit odio illum! Animi quis quaerat explicabo autem optio et!",
          is_active: true,
          instructor: "1",
          lessons: [],
          tags: [],
        },
      ],
    });
  }),
];
