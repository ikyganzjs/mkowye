const axios = require("axios");

async function robloxStalk(username) {
  try {
    // 🔹 Gunakan POST untuk mencari user by username
    const search = await axios.post(
      "https://users.roblox.com/v1/usernames/users",
      {
        usernames: [username],
        excludeBannedUsers: false,
      },
      {
        headers: {
          "User-Agent": "Mozilla/5.0",
          "Content-Type": "application/json",
        },
      }
    );

    if (!search.data.data || search.data.data.length === 0) {
      return { error: "Username tidak ditemukan" };
    }

    const user = search.data.data[0];
    const userId = user.id;

    // 🔹 Ambil profil & data tambahan
    const [profile, avatar, friends, followers, following] = await Promise.all([
      axios.get(`https://users.roblox.com/v1/users/${userId}`),
      axios.get(
        `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=420x420&format=Png&isCircular=false`
      ),
      axios.get(`https://friends.roblox.com/v1/users/${userId}/friends/count`),
      axios.get(
        `https://friends.roblox.com/v1/users/${userId}/followers/count`
      ),
      axios.get(
        `https://friends.roblox.com/v1/users/${userId}/followings/count`
      ),
    ]);

    return {
      id: userId,
      name: profile.data.name,
      displayName: profile.data.displayName,
      description: profile.data.description || "Tidak ada deskripsi",
      created: profile.data.created,
      isBanned: profile.data.isBanned,
      avatar: avatar.data.data[0]?.imageUrl || null,
      counts: {
        friends: friends.data.count,
        followers: followers.data.count,
        following: following.data.count,
      },
    };
  } catch (err) {
    console.error("Gagal scrape Roblox:", err.message);
    return { error: "Gagal mengambil data Roblox" };
  }
}

module.exports = {
  name: "Roblox Stalk",
  desc: "Stalking roblox account",
  category: "Stalker",
  path: "/robloxstalk?apikey=&username=",
  async run(req, res) {
    const { apikey, username } = req.query;

    if (!apikey || !global.apikey.includes(apikey))
      return res.json({ status: false, error: "Apikey invalid" });

    if (!username)
      return res.json({ status: false, error: "Masukkan username Roblox" });

    const result = await robloxStalk(username);

    if (result.error)
      return res.json({ status: false, error: result.error });

    res.json({
      status: true,
      result,
    });
  },
};
