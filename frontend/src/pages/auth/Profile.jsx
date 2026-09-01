// components/Profile.jsx
import { useState, useContext } from "react";
import { AuthContext } from "../../contexts/AuthContext";
import api from "../../services/api";
import { Container, Form, Button, Image, Spinner } from "react-bootstrap";

const Profile = () => {
  const { user, setUser } = useContext(AuthContext);
  const [bio, setBio] = useState(user?.profile?.bio || "");
  const [avatar, setAvatar] = useState(null);
  const [preview, setPreview] = useState(user?.profile?.image || "");
  const [loading, setLoading] = useState(false);

  // Handle file selection and create a preview URL
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatar(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // 1. Initialize FormData (Required for sending files)
    const formData = new FormData();

    // 2. Append our data
    formData.append("bio", bio);
    if (avatar) {
      formData.append("avatar", avatar);
    }

    try {
      // 3. Send the PATCH request to our dedicated profile endpoint
      // Note: api.js automatically attaches the Authorization header
      const response = await api.patch("/api/profile/me/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      // 4. Update the global user context with the new profile data
      setUser((prevUser) => ({
        ...prevUser,
        profile: response.data,
      }));

      alert("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <p>Loading profile...</p>;

  
  return (
    <Container className="mt-4" style={{ maxWidth: "600px" }}>
      <h2 className="mb-4">{user.username}'s Profile</h2>

      <Form onSubmit={handleSubmit}>
        <Form.Group className="mb-4" controlId="profileAvatar">
          <Form.Label>Profile Picture</Form.Label>
          <div className="d-flex flex-column align-items-start gap-3">
            {preview && (
              <Image
                src={preview}
                alt="Profile Preview"
                roundedCircle
                style={{ width: "150px", height: "150px", objectFit: "cover" }}
                thumbnail
              />
            )}
            <Form.Control
              type="file"
              accept="image/*"
              onChange={handleImageChange}
            />
          </div>
        </Form.Group>

        <Form.Group className="mb-4" controlId="profileBio">
          <Form.Label>Bio</Form.Label>
          <Form.Control
            as="textarea"
            rows={4}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell us about yourself..."
          />
        </Form.Group>

        <Button variant="primary" type="submit" disabled={loading}>
          {loading ? (
            <>
              <Spinner
                as="span"
                animation="border"
                size="sm"
                role="status"
                aria-hidden="true"
                className="me-2"
              />
              Saving...
            </>
          ) : (
            "Save Profile"
          )}
        </Button>
      </Form>
    </Container>
  );
};

export default Profile;
